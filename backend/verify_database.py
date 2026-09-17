from sqlalchemy import create_engine, text
from app.config import settings

def verify_database():
    print('--- DATABASE SCHEMA & INDEX VERIFICATION BEGIN ---')
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        # 1. Connection check
        res = conn.execute(text("SELECT current_database(), current_user, version();")).fetchone()
        print(f"1. Connected to Database: '{res[0]}', User: '{res[1]}'")
        print(f"   PostgreSQL Version: {res[2][:45]}...")

        # 2. Verify tables
        tables = conn.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
        )).fetchall()
        table_names = [t[0] for t in tables]
        print(f"2. Public Tables Found: {table_names}")
        assert 'engines' in table_names, "Table 'engines' missing"
        assert 'telemetry' in table_names, "Table 'telemetry' missing"
        assert 'missions' in table_names, "Table 'missions' missing"
        assert 'fault_logs' in table_names, "Table 'fault_logs' missing"
        print("   All 4 required tables ('engines', 'telemetry', 'missions', 'fault_logs') EXIST.")


        # 3. Verify indexes
        indexes = conn.execute(text(
            "SELECT tablename, indexname FROM pg_indexes WHERE schemaname='public' ORDER BY tablename, indexname;"
        )).fetchall()
        index_list = [(i[0], i[1]) for i in indexes]
        print(f"3. Indexes Found ({len(index_list)} total):")
        for tbl, idx in index_list:
            print(f"   - Table [{tbl}]: Index [{idx}]")

        # Check critical indexes
        idx_names = [i[1] for i in index_list]
        assert 'ix_engines_engine_id' in idx_names or any('engine_id' in i for i in idx_names), "Engine ID index missing"
        assert any('timestamp' in i for i in idx_names), "Telemetry timestamp index missing"
        assert any('mission_id' in i for i in idx_names), "Mission ID index missing"
        print("   Required indexes on engine_id, timestamp, and mission_id VERIFIED.")

        # 4. Verify data timestamps
        eng = conn.execute(text("SELECT engine_id, created_at, updated_at FROM engines LIMIT 1;")).fetchone()
        print(f"4. Engine timestamp behavior: Engine '{eng[0]}' created_at={eng[1]}")
        assert eng[1] is not None, "Timestamp was not populated"

        tel = conn.execute(text("SELECT id, engine_id, timestamp, rpm FROM telemetry LIMIT 1;")).fetchone()
        print(f"   Telemetry timestamp behavior: Record {tel[0]} for '{tel[1]}' timestamp={tel[2]}, RPM={tel[3]}")
        assert tel[2] is not None, "Telemetry timestamp was not populated"

        mis = conn.execute(text("SELECT mission_id, start_time, created_at FROM missions LIMIT 1;")).fetchone()
        print(f"   Mission timestamp behavior: Mission '{mis[0]}' start_time={mis[1]}, created_at={mis[2]}")
        assert mis[1] is not None and mis[2] is not None, "Mission timestamps not populated"

    print('--- DATABASE VERIFICATION SUCCESSFUL ---')

if __name__ == '__main__':
    verify_database()
