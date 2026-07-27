import os
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

connection_pool = pool.SimpleConnectionPool(
    1, 10,
    host=os.getenv("DB_HOST", "localhost"),
    port=os.getenv("DB_PORT", "5432"),
    dbname=os.getenv("DB_NAME", "indian_product_search"),
    user=os.getenv("DB_USER", "postgres"),
    password=os.getenv("DB_PASSWORD", ""),
)


def get_conn():
    conn = connection_pool.getconn()
    conn.autocommit = True  # so functions like log_product_view() persist
    return conn


def put_conn(conn):
    connection_pool.putconn(conn)


def query(sql, params=None, fetchone=False):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or ())
            if fetchone:
                return cur.fetchone()
            return cur.fetchall()
    finally:
        put_conn(conn)
