import urllib.request
import json
import sys

BASE_URL = 'http://127.0.0.1:8000'

def req(url, method='GET', data=None):
    request = urllib.request.Request(url, method=method)
    request.add_header('Content-Type', 'application/json')
    body = json.dumps(data).encode('utf-8') if data else None
    with urllib.request.urlopen(request, data=body) as res:
        return res.status, json.loads(res.read().decode())

def run_tests():
    print('--- BACKEND VERIFICATION BEGIN ---')

    # 1. Verify GET /
    s, b = req(f'{BASE_URL}/')
    print(f'1. GET / -> Status {s}, Body: {b}')
    assert s == 200 and b.get('project') == 'TwinProp-DX' and b.get('status') == 'online', 'Root failed'

    # 2. Verify GET /health
    s, b = req(f'{BASE_URL}/health')
    print(f'2. GET /health -> Status {s}, Body: {b}')
    assert s == 200 and b.get('status') == 'healthy' and b.get('database') == 'connected', 'Health failed'

    # 3. Verify GET /api/engines
    s, b = req(f'{BASE_URL}/api/engines')
    print(f'3. GET /api/engines -> Status {s}, Existing Engines Count: {len(b)}')
    assert s == 200, 'Get engines failed'

    # 4. Create engine ENG-ROTAX-914-01 (or retrieve if already exists)
    engine_id = 'ENG-ROTAX-914-01'
    existing = [e for e in b if e.get('engine_id') == engine_id]
    if not existing:
        engine_data = {
            'engine_id': engine_id,
            'engine_type': 'Rotax 914 F Turbocharged',
            'aircraft_id': 'UAV-MALE-TAPAS-01',
            'status': 'OPERATIONAL'
        }
        s, b = req(f'{BASE_URL}/api/engines', method='POST', data=engine_data)
        print(f'4. POST /api/engines -> Status {s}, Registered: {b.get("engine_id")}')
        assert s == 201 and b.get('engine_id') == engine_id, 'Create engine failed'
    else:
        print(f'4. Engine {engine_id} already registered from previous run.')

    # 5. Verify it can be retrieved
    s, b = req(f'{BASE_URL}/api/engines/{engine_id}')
    print(f'5. GET /api/engines/{engine_id} -> Status {s}, Aircraft: {b.get("aircraft_id")}')
    assert s == 200 and b.get('engine_id') == engine_id, 'Retrieve engine failed'

    # 6. Insert telemetry for that engine
    telemetry_data = {
        'engine_id': engine_id,
        'rpm': 5280.0,
        'cht': 112.4,
        'egt': 825.6,
        'oil_pressure': 3.65,
        'oil_temperature': 89.2,
        'fuel_flow': 25.4,
        'vibration': 6.85,
        'throttle': 88.0,
        'ambient_temperature': 14.5,
        'altitude': 3200.0,
        'battery_voltage': 28.1
    }
    s, b = req(f'{BASE_URL}/api/telemetry', method='POST', data=telemetry_data)
    print(f'6. POST /api/telemetry -> Status {s}, Packet ID: {b.get("id")}')
    assert s == 201 and b.get('rpm') == 5280.0, 'Insert telemetry failed'

    # 7. Retrieve latest telemetry
    s, b = req(f'{BASE_URL}/api/telemetry/{engine_id}/latest')
    print(f'7. GET /api/telemetry/{engine_id}/latest -> Status {s}, RPM: {b.get("rpm")}, CHT: {b.get("cht")}')
    assert s == 200, 'Get latest telemetry failed'

    # 8. Verify returned values match inserted values
    for k, v in telemetry_data.items():
        assert b.get(k) == v, f'Telemetry mismatch on {k}: expected {v}, got {b.get(k)}'
    print('8. Telemetry exact match verification PASSED for all 12 sensor parameters!')

    # 9. Create mission MSN-2026-001
    mission_id = 'MSN-2026-001'
    # check if mission exists
    s, m_list = req(f'{BASE_URL}/api/missions')
    if not any(m.get('mission_id') == mission_id for m in m_list):
        mission_data = {
            'mission_id': mission_id,
            'engine_id': engine_id,
            'mission_type': 'High-Altitude Reconnaissance',
            'start_time': '2026-09-17T06:00:00Z',
            'end_time': '2026-09-17T14:30:00Z',
            'altitude': 6000.0,
            'payload': 'EO/IR High-Res Optical Pod (45kg)',
            'environment': 'High Altitude Sub-Zero (-22C)',
            'status': 'PLANNED'
        }
        s, b = req(f'{BASE_URL}/api/missions', method='POST', data=mission_data)
        print(f'9. POST /api/missions -> Status {s}, Mission: {b.get("mission_id")}')
        assert s == 201 and b.get('mission_id') == mission_id, 'Create mission failed'
    else:
        print(f'9. Mission {mission_id} already exists.')

    # 10. Verify mission appears in mission list
    s, b = req(f'{BASE_URL}/api/missions')
    print(f'10. GET /api/missions -> Status {s}, Total Missions: {len(b)}')
    assert s == 200 and any(m.get('mission_id') == mission_id for m in b), 'Mission not found in list'

    # --- Phase 3 Fault Diagnosis Verifications ---
    # 11. Real-time diagnosis on latest telemetry
    s, b = req(f'{BASE_URL}/api/faults/{engine_id}/diagnosis')
    print(f'11. GET /api/faults/{engine_id}/diagnosis -> Status {s}, Severity: {b.get("severity")}, Health: {b.get("health_index")}%')
    assert s == 200 and 'anomaly_score' in b and 'feature_attributions' in b, 'Diagnosis failed'

    # 12. Simulated fault injection (Ignition Misfire)
    sim_data = {
        'engine_id': engine_id,
        'scenario': 'IGNITION_MISFIRE',
        'severity': 'WARNING'
    }
    s, b = req(f'{BASE_URL}/api/faults/simulate', method='POST', data=sim_data)
    print(f'12. POST /api/faults/simulate (IGNITION_MISFIRE) -> Status {s}, Fault: {b.get("primary_fault")}, Code: {b.get("fault_code")}')
    assert s == 201 and b.get('primary_fault') == 'IGNITION_MISFIRE', 'Simulated fault failed'
    assert b.get('is_simulated') is True, 'is_simulated flag missing'

    # 13. Retrieve fault logs
    s, b = req(f'{BASE_URL}/api/faults/{engine_id}')
    print(f'13. GET /api/faults/{engine_id} -> Status {s}, Logged Faults: {len(b)}')
    assert s == 200 and len(b) > 0, 'No fault logs retrieved'
    logged_fault = b[0]

    # 14. Acknowledge fault
    fault_id = logged_fault.get('id')
    s, b = req(f'{BASE_URL}/api/faults/{fault_id}/acknowledge', method='POST', data={'is_acknowledged': True})
    print(f'14. POST /api/faults/{fault_id}/acknowledge -> Status {s}, Acknowledged: {b.get("is_acknowledged")}')
    assert s == 200 and b.get('is_acknowledged') is True, 'Fault acknowledgment failed'

    print('--- ALL BACKEND (PHASE 1 + PHASE 3) VERIFICATIONS PASSED SUCCESSFULLY ---')

if __name__ == '__main__':
    run_tests()

