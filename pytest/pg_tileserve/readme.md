#Map Server setup

##pg_featureserv.json

For what settings can be done, see the [sample settings file](https://github.com/CrunchyData/pg_featureserv/blob/master/config/pg_featureserv.toml.example) in the pg_featureserv repo.

Server
Debug: prints verbose logging. I think that is it, but need confirmation

Paging
LimitDefault: the number of items returned if the query doesn't specify quantity.

You can use SQL functions in your query, but some that do more computations need whitelisting.
For a list of functions, see: 
Here are some:

    "ST_Boundary",
    Returns the boundary of a geometry (points for lines, lines for polygons).

    "ST_Centroid",
    Computes the geometric center point of a geometry.

    "ST_Envelope",
    Returns the minimum bounding rectangle (bbox) of a geometry.

    "ST_Buffer",
    Creates a polygon around a geometry that is larger (or smaller) than the shape. 'Buffer' here means buffer zone.

    "ST_ConvexHull",
    Returns the smallest convex polygon that contains all points of a geometry.

    "ST_MinimumBoundingCircle",
    Returns the smallest circle that contains the entire geometry.

    "ST_Simplify", 
    Reduces the number of vertices in a geometry using the Douglas-Peucker algorithm.

    "ST_ChaikinSmoothing",
    Smooths a geometry by iteratively replacing vertices with new points.
    
    "ST_LineSubstring",
    Returns a portion of a line between two fractional positions (0.0 to 1.0).