import geopandas as gpd


import geopandas as gpd
from shapely.geometry import LineString, MultiLineString, Point


def remove_isolated_edges(
    gdf: gpd.GeoDataFrame,
    tolerance: float = 0.0,
) -> gpd.GeoDataFrame:
    """
    Drop line features that do not connect to any other line at either endpoint.

    If tolerance == 0: an endpoint must touch/intersect another line exactly.
    If tolerance  > 0: an endpoint-buffer (radius=tolerance) must intersect another line.

    Returns only non-null line geometries from the input (same as the original behavior).
    """
    if gdf.empty:
        return gdf.copy()

    if tolerance > 0 and gdf.crs is None:
        raise ValueError("GeoDataFrame has no CRS. Set gdf.crs before using tolerance.")

    lines = gdf.loc[gdf.geometry.notna()].copy()
    if lines.empty:
        return lines

    sindex = lines.sindex

    def iter_endpoints(geom):
        if geom is None:
            return
        if isinstance(geom, LineString):
            coords = list(geom.coords)
            if len(coords) >= 2:
                yield Point(coords[0])
                yield Point(coords[-1])
            return
        if isinstance(geom, MultiLineString):
            for part in geom.geoms:
                coords = list(part.coords)
                if len(coords) >= 2:
                    yield Point(coords[0])
                    yield Point(coords[-1])

    def is_connected(row_idx, geom) -> bool:
        for pt in iter_endpoints(geom) or ():
            query_geom = pt if tolerance <= 0 else pt.buffer(tolerance)

            candidate_pos = list(sindex.intersection(query_geom.bounds))
            if not candidate_pos:
                continue

            candidates = lines.iloc[candidate_pos]
            candidates = candidates[candidates.index != row_idx]
            if candidates.empty:
                continue

            if candidates.intersects(query_geom).any():
                return True

        return False

    keep_mask = [is_connected(idx, geom) for idx, geom in lines.geometry.items()]
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
