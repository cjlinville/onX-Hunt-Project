import geopandas as gpd


import geopandas as gpd
from shapely.geometry import LineString, MultiLineString, Point


def remove_isolated_edges(gdf: gpd.GeoDataFrame, tolerance: float = 0.0) -> gpd.GeoDataFrame:
    
    if gdf.empty:
        return gdf.copy()

    if gdf.crs is None:
        raise ValueError("GeoDataFrame has no CRS. Set gdf.crs before using tolerance.")

    lines = gdf[gdf.geometry.notna()].copy()
    if lines.empty:
        return lines

    sindex = lines.sindex
    geoms = lines.geometry

    def endpoints(geom):
        if geom is None:
            return []
        if isinstance(geom, LineString):
            coords = list(geom.coords)
            if len(coords) < 2:
                return []
            return [Point(coords[0]), Point(coords[-1])]
        if isinstance(geom, MultiLineString):
            pts = []
            for part in geom.geoms:
                coords = list(part.coords)
                if len(coords) >= 2:
                    pts.append(Point(coords[0]))
                    pts.append(Point(coords[-1]))
            return pts
        return []

    keep_mask = []

    for idx, geom in geoms.items():
        pts = endpoints(geom)
        if not pts:
            keep_mask.append(False)
            continue

        connected = False

        for pt in pts:
            query_geom = pt if tolerance <= 0 else pt.buffer(tolerance)

            # candidates are index positions from spatial index
            candidate_pos = list(sindex.intersection(query_geom.bounds))
            if not candidate_pos:
                continue

            candidates = lines.iloc[candidate_pos]

            # remove self
            candidates = candidates[candidates.index != idx]
            if candidates.empty:
                continue

            if tolerance <= 0:
                # exact: endpoint intersects another line (touching counts as intersects)
                if candidates.intersects(pt).any():
                    connected = True
                    break
            else:
                # tolerant: endpoint buffer intersects another line
                if candidates.intersects(query_geom).any():
                    connected = True
                    break

        keep_mask.append(connected)

    return lines.loc[keep_mask].copy()

def remove_lines_with_no_name(gdf):
    if 'Name' in gdf.columns:
        return gdf[gdf['Name'].notna()]
    return gdf

def dissolve_by_name(gdf):
    if 'Owner' in gdf.columns:
        return gdf.dissolve("Owner")
    return gdf

def main(file,gdf,field_mappings):
    if "flowline" in file.name:
        gdf = remove_isolated_edges(gdf)
        gdf = remove_lines_with_no_name(gdf)
    if "trail" in file.name:
        gdf = remove_isolated_edges(gdf)
    if "road" in file.name:
        gdf = remove_isolated_edges(gdf)
    if "parcels" in file.name:
        gdf = dissolve_by_name(gdf)
    
    return gdf
