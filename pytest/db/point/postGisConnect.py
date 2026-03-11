import psycopg
from contextlib import contextmanager

# Database connection info
POSTGRES_HOST = "localhost"
POSTGRES_DB = "ibf"
POSTGRES_USER = "ibf"
POSTGRES_PASSWORD = "ibf"
POSTGRES_PORT = 5436 #5432


@contextmanager
def get_db_connection():
    """
    Context manager for database connections.
    Yields a connection object and handles cleanup.
    """
    conn = psycopg.connect(
        host=POSTGRES_HOST,
        dbname=POSTGRES_DB,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        port=POSTGRES_PORT
    )
    try:
        yield conn
    finally:
        conn.close()


def enable_postgis(conn):
    """
    Enable PostGIS extension on the database.
    
    Args:
        conn: Database connection object
    """
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        conn.commit()
    print("PostGIS extension enabled!")


def create_spatial_table(conn, table_name, columns, drop_if_exists=True):
    """
    Create a table with spatial capabilities.
    
    Args:
        conn: Database connection object
        table_name: Name of the table to create
        columns: Dictionary of column definitions (name: type)
        drop_if_exists: Whether to drop the table if it already exists
        
    Example:
        columns = {
            'id': 'SERIAL PRIMARY KEY',
            'name': 'VARCHAR(255)',
            'lat': 'DOUBLE PRECISION',
            'lon': 'DOUBLE PRECISION',
            'geom': 'GEOMETRY(Point, 4326)'
        }
    """
    with conn.cursor() as cur:
        if drop_if_exists:
            cur.execute(f"DROP TABLE IF EXISTS {table_name};")
        
        column_defs = ", ".join([f"{name} {type_}" for name, type_ in columns.items()])
        create_sql = f"CREATE TABLE {table_name} ({column_defs});"
        
        cur.execute(create_sql)
        conn.commit()
    print(f"Table '{table_name}' created successfully!")


def create_spatial_index(conn, table_name, geom_column='geom'):
    """
    Create a spatial index on a geometry column.
    
    Args:
        conn: Database connection object
        table_name: Name of the table
        geom_column: Name of the geometry column (default: 'geom')
    """
    with conn.cursor() as cur:
        index_name = f"{table_name}_{geom_column}_idx"
        cur.execute(f"CREATE INDEX {index_name} ON {table_name} USING GIST ({geom_column});")
        conn.commit()
    print(f"Spatial index created on {table_name}.{geom_column}!")
