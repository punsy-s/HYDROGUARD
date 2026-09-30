import json
import heapq
import math
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import Village, Shelter, Road, Infrastructure, SimulationScenario

class EvacuationRoutingEngine:
    """
    Traffic-Aware, Safety-Constrained Evacuation Graph Routing Engine.
    Prioritizes life safety over distance.
    Strictly excludes roads with flood depth > 0.30m or compromised bridges.
    """

    @classmethod
    def build_network_graph(
        cls,
        roads: List[Road],
        closed_road_ids: List[str],
        compromised_bridges: List[str],
        road_depths: Dict[str, float],
        road_traffic_loads: Dict[str, float]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Builds adjacency list graph with safety filtering and Greenshields traffic impedances.
        """
        graph: Dict[str, List[Dict[str, Any]]] = {}

        for r in roads:
            # Check 1: Manual closure
            if r.is_closed or r.id in closed_road_ids:
                continue

            # Check 2: Water depth safety threshold
            # Water depth > 0.30m (1 foot) causes passenger cars to float and lose steering traction
            depth_m = road_depths.get(r.id, r.current_water_depth_m or 0.0)
            if depth_m > 0.30:
                continue  # STRICT EXCLUSION

            # Check 3: Compromised bridges
            if any(brg in r.name for brg in compromised_bridges):
                continue  # STRICT EXCLUSION

            # Calculate effective speed via Greenshields traffic density formulation
            # v = v_free * (1 - volume / capacity)
            base_speed = max(20.0, r.base_speed_kmph)
            capacity = max(500, r.capacity_vph)
            current_volume = road_traffic_loads.get(r.id, 200.0)
            
            congestion_ratio = min(0.95, current_volume / float(capacity))
            effective_speed = base_speed * (1.0 - (0.75 * congestion_ratio))

            # Additional penalty if waterlogged (0.05m to 0.30m)
            if depth_m > 0.05:
                effective_speed = min(effective_speed, 18.0)  # Cautious crawl
                hazard_penalty_minutes = depth_m * 15.0
            else:
                hazard_penalty_minutes = 0.0

            # Distance estimation from coordinates
            try:
                coords = json.loads(r.coordinates_json)
                dist_km = 0.0
                for i in range(len(coords) - 1):
                    # Haversine distance
                    lat1, lon1 = coords[i][1], coords[i][0]
                    lat2, lon2 = coords[i+1][1], coords[i+1][0]
                    dlat = math.radians(lat2 - lat1)
                    dlon = math.radians(lon2 - lon1)
                    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
                    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
                    dist_km += 6371.0 * c
                dist_km = max(0.8, round(dist_km, 2))
            except Exception:
                dist_km = 2.5
                coords = []

            travel_time_min = (dist_km / effective_speed) * 60.0 + hazard_penalty_minutes

            # Edge entry
            edge_forward = {
                "to_node": r.to_node,
                "road_id": r.id,
                "road_name": r.name,
                "distance_km": dist_km,
                "travel_time_min": travel_time_min,
                "effective_speed_kmph": round(effective_speed, 1),
                "depth_m": depth_m,
                "congestion_ratio": congestion_ratio,
                "coordinates": coords
            }
            edge_reverse = {
                "to_node": r.from_node,
                "road_id": r.id,
                "road_name": r.name,
                "distance_km": dist_km,
                "travel_time_min": travel_time_min,
                "effective_speed_kmph": round(effective_speed, 1),
                "depth_m": depth_m,
                "congestion_ratio": congestion_ratio,
                "coordinates": list(reversed(coords)) if coords else []
            }

            graph.setdefault(r.from_node, []).append(edge_forward)
            graph.setdefault(r.to_node, []).append(edge_reverse)

        return graph

    @classmethod
    def find_safe_routes(
        cls,
        graph: Dict[str, List[Dict[str, Any]]],
        origin_node: str,
        shelters: List[Shelter],
        target_shelter_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Runs multi-target Dijkstra search across the safe road graph.
        Generates alternative paths to available high-ground shelters.
        """
        shelter_map = {s.id: s for s in shelters}
        target_ids = [target_shelter_id] if target_shelter_id else list(shelter_map.keys())

        # Priority queue: (total_time_min, current_node, path_edges)
        pq: List[Tuple[float, str, List[Dict[str, Any]]]] = [(0.0, origin_node, [])]
        visited_nodes: Dict[str, float] = {}
        routes_found: List[Dict[str, Any]] = []

        while pq and len(routes_found) < 3:
            time_cost, curr_node, path = heapq.heappop(pq)

            if curr_node in visited_nodes and visited_nodes[curr_node] <= time_cost:
                continue
            visited_nodes[curr_node] = time_cost

            # Check if reached a safe shelter
            if curr_node in target_ids and len(path) > 0:
                shelter = shelter_map[curr_node]
                avail_cap = max(0, shelter.total_capacity - shelter.current_occupancy)

                # Collect waypoints & turn by turns
                all_coords = []
                directions = [f"Depart {origin_node} via designated emergency route"]
                total_dist = 0.0
                max_route_depth = 0.0
                max_congestion = 0.0

                for edge in path:
                    total_dist += edge["distance_km"]
                    max_route_depth = max(max_route_depth, edge["depth_m"])
                    max_congestion = max(max_congestion, edge["congestion_ratio"])
                    directions.append(f"Proceed on {edge['road_name']} ({edge['distance_km']} km at ~{edge['effective_speed_kmph']} km/h)")
                    all_coords.extend(edge["coordinates"])

                directions.append(f"Arrive safely at {shelter.name} (Elevation: {shelter.elevation_m}m). Check in with camp officer.")

                # Congestion category
                if max_congestion > 0.70:
                    cong_label = "Heavy Traffic - Evacuation Convoy"
                elif max_congestion > 0.40:
                    cong_label = "Moderate Flow"
                else:
                    cong_label = "Free Flowing"

                # Safety level rating
                if max_route_depth > 0.20:
                    safety_rating = "CAUTION - Shallow Waterlogging"
                elif max_route_depth > 0.0:
                    safety_rating = "SAFE - Minor Wet Surface"
                else:
                    safety_rating = "SAFE - Dry High Ridge Corridor"

                routes_found.append({
                    "route_id": f"ROUTE-{origin_node}-{curr_node}-{len(routes_found)+1}",
                    "name": f"Route to {shelter.name}",
                    "shelter_id": shelter.id,
                    "shelter_name": shelter.name,
                    "shelter_available_capacity": avail_cap,
                    "shelter_elevation_m": shelter.elevation_m,
                    "distance_km": round(total_dist, 2),
                    "estimated_travel_time_min": round(time_cost, 1),
                    "max_flood_depth_on_route_m": round(max_route_depth, 2),
                    "safety_rating": safety_rating,
                    "congestion_level": cong_label,
                    "is_recommended": (len(routes_found) == 0 and avail_cap > 50),
                    "waypoints": all_coords,
                    "turn_by_turn": directions
                })

            for edge in graph.get(curr_node, []):
                next_node = edge["to_node"]
                edge_cost = edge["travel_time_min"]
                if next_node not in visited_nodes or visited_nodes[next_node] > time_cost + edge_cost:
                    heapq.heappush(pq, (time_cost + edge_cost, next_node, path + [edge]))

        return routes_found

def calculate_evacuation_routes(
    db: Session,
    catchment_id: str,
    village_id: Optional[str] = None,
    origin_lat: Optional[float] = None,
    origin_lon: Optional[float] = None,
    target_shelter_id: Optional[str] = None,
    current_scenario_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Coordinates graph building, flood condition ingestion, shelter capacity verification,
    and returns multi-route options with turn-by-turn navigation.
    """
    roads = db.query(Road).filter(Road.catchment_id == catchment_id).all()
    shelters = db.query(Shelter).filter(Shelter.catchment_id == catchment_id).all()
    villages = db.query(Village).filter(Village.catchment_id == catchment_id).all()

    # Determine origin node
    origin_name = "User Location"
    origin_node = "VIL-02" # Default to Nirjuli if unspecified

    if village_id:
        v = db.query(Village).filter(Village.id == village_id).first()
        if v:
            origin_node = v.id
            origin_name = v.name
            origin_lat = v.latitude
            origin_lon = v.longitude
    elif origin_lat and origin_lon:
        # Find nearest village node
        closest_v = min(
            villages,
            key=lambda v: (v.latitude - origin_lat)**2 + (v.longitude - origin_lon)**2
        )
        origin_node = closest_v.id
        origin_name = f"Near {closest_v.name}"

    # Ingest road hazards from active scenario or DB
    road_depths: Dict[str, float] = {}
    closed_roads: List[str] = []
    compromised_bridges: List[str] = []
    traffic_loads: Dict[str, float] = {}

    if current_scenario_id == "scenario-critical":
        # Critical flood hazards
        road_depths["ROAD-SH-01"] = 1.85   # Harmuti-Pichola Embankment Road flooded
        closed_roads.append("ROAD-SH-01")
        road_depths["ROAD-RURAL-01"] = 1.20 # Rural road flooded
        closed_roads.append("ROAD-RURAL-01")
        road_depths["ROAD-NH-415-01"] = 0.45 # NH-415 low culvert flooded
        closed_roads.append("ROAD-NH-415-01")
        compromised_bridges.append("Pichola")
        # Heavy traffic load on main arterial escape routes
        traffic_loads["ROAD-EVAC-02"] = 1400.0
        traffic_loads["ROAD-NH-415-02"] = 1600.0
    elif current_scenario_id == "scenario-rising":
        road_depths["ROAD-SH-01"] = 0.55
        closed_roads.append("ROAD-SH-01")
        traffic_loads["ROAD-EVAC-02"] = 700.0
    else:
        # Normal
        traffic_loads["ROAD-NH-415-01"] = 400.0

    # Build safe road graph
    graph = EvacuationRoutingEngine.build_network_graph(
        roads=roads,
        closed_road_ids=closed_roads,
        compromised_bridges=compromised_bridges,
        road_depths=road_depths,
        road_traffic_loads=traffic_loads
    )

    routes = EvacuationRoutingEngine.find_safe_routes(
        graph=graph,
        origin_node=origin_node,
        shelters=shelters,
        target_shelter_id=target_shelter_id
    )

    primary_rec = routes[0] if routes else None

    return {
        "origin": {
            "node_id": origin_node,
            "name": origin_name,
            "latitude": origin_lat,
            "longitude": origin_lon
        },
        "routes": routes,
        "primary_recommendation": primary_rec,
        "safety_disclaimer": (
            "SAFETY NOTICE: Routes are dynamically filtered to exclude submerged roads (>0.30m) "
            "and compromised bridges. Never enter moving floodwaters. Follow on-ground SDRF/police directions."
        )
    }
