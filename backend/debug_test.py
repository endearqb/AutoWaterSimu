#!/usr/bin/env python3

import sys
sys.path.append('.')

from app.tests.test_flowchart_conversion import TestFlowchartConversion
from app.models import MaterialBalanceInput

def debug_test():
    test = TestFlowchartConversion()
    test.setup_method()
    
    result = test.conversion_service.convert_flowchart_to_material_balance_input(
        test.sample_flowchart_data
    )
    
    print('=== Debug Test Results ===')
    print(f'Result type: {type(result)}')
    print(f'Is MaterialBalanceInput: {isinstance(result, MaterialBalanceInput)}')
    print(f'Nodes count: {len(result.nodes)} (expected: 3)')
    print(f'Edges count: {len(result.edges)} (expected: 2)')
    
    inlet_nodes = [n for n in result.nodes if n.is_inlet]
    outlet_nodes = [n for n in result.nodes if n.is_outlet]
    
    print(f'Inlet nodes count: {len(inlet_nodes)} (expected: 1)')
    print(f'Outlet nodes count: {len(outlet_nodes)} (expected: 1)')
    
    if inlet_nodes:
        inlet_node = inlet_nodes[0]
        print(f'Inlet node id: {inlet_node.node_id}')
        print(f'Expected inlet id: input-1754272842581-hcmtq8pt0')
        print(f'Inlet concentrations length: {len(inlet_node.initial_concentrations)} (expected: 7)')
        print(f'Inlet concentrations: {inlet_node.initial_concentrations}')
        print(f'Expected first concentration (COD): 100.0, actual: {inlet_node.initial_concentrations[0] if len(inlet_node.initial_concentrations) > 0 else "N/A"}')
        print(f'Expected second concentration (NH3-N): 40.0, actual: {inlet_node.initial_concentrations[1] if len(inlet_node.initial_concentrations) > 1 else "N/A"}')
        print(f'Third concentration (NO3-N): {inlet_node.initial_concentrations[2] if len(inlet_node.initial_concentrations) > 2 else "N/A"} (test data has 10.0)')
    
    # Now let's run the actual test method to see what fails
    print('\n=== Running actual test method ===')
    try:
        test.test_convert_flowchart_to_material_balance_input()
        print('Test passed!')
    except Exception as e:
        print(f'Test failed with error: {e}')
        import traceback
        traceback.print_exc()
    
    if result.edges:
        edge1 = result.edges[0]
        print(f'\nEdge 1 id: {edge1.edge_id} (expected: edge-1754272848766)')
        print(f'Edge 1 flow: {edge1.flow_rate} (expected: 750.0)')
        print(f'Edge 1 source: {edge1.source_node_id} (expected: input-1754272842581-hcmtq8pt0)')
        print(f'Edge 1 target: {edge1.target_node_id} (expected: default-1754272846489-67mchq4cm)')
        print(f'Edge 1 concentration_factor_a length: {len(edge1.concentration_factor_a)} (expected: 7)')
        print(f'Edge 1 concentration_factor_b length: {len(edge1.concentration_factor_b)} (expected: 7)')
        if len(edge1.concentration_factor_a) > 0:
            print(f'Edge 1 first factor_a: {edge1.concentration_factor_a[0]} (expected: 1.0)')
        if len(edge1.concentration_factor_b) > 0:
            print(f'Edge 1 first factor_b: {edge1.concentration_factor_b[0]} (expected: 0.0)')
    
    print(f'\nCalculation parameters:')
    print(f'Hours: {result.parameters.hours} (expected: 10.0)')
    print(f'Steps per hour: {result.parameters.steps_per_hour} (expected: 30)')
    print(f'Solver method: {result.parameters.solver_method} (expected: scipy_solver)')
    print(f'Tolerance: {result.parameters.tolerance} (expected: 0.000001)')
    
    return result

if __name__ == '__main__':
    debug_test()