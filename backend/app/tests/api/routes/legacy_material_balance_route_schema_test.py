from app.main import app


def test_material_balance_input_schema_exposes_legacy_component_metadata() -> None:
    schema = app.openapi()
    material_balance_input = schema["components"]["schemas"]["MaterialBalanceInput"]
    properties = material_balance_input["properties"]

    assert "customParameters" in properties
    assert properties["customParameters"]["type"] == "array"
    assert "component_schema" in properties
    assert "original_flowchart_data" in properties
