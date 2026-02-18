"""
Main script to create all data point tables.
This script orchestrates the creation of various point layer tables from CSV data.
"""
import sys
from makeRcLocTables import create_red_cross_branches_table
from makeGlofasTables import create_glofas_stations_table


def main():
    """
    Main function to create all data point tables.
    """
    print("\n" + "="*60)
    print("Creating All Data Point Tables")
    print("="*60 + "\n")
    
    # Track success/failure
    tables_created = []
    tables_failed = []
    
    # Create Red Cross Branches table
    try:
        print("\n[1/2] Creating Red Cross Branches table...")
        create_red_cross_branches_table()
        tables_created.append("red_cross_branches")
    except Exception as e:
        print(f"ERROR: Failed to create red_cross_branches table: {e}")
        tables_failed.append("red_cross_branches")
    
    # Create Glofas Stations table
    try:
        print("\n[2/2] Creating Glofas Stations table...")
        create_glofas_stations_table()
        tables_created.append("glofas_stations")
    except Exception as e:
        print(f"ERROR: Failed to create glofas_stations table: {e}")
        tables_failed.append("glofas_stations")
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Tables created successfully: {len(tables_created)}")
    for table in tables_created:
        print(f"  ✓ {table}")
    
    if tables_failed:
        print(f"\nTables failed: {len(tables_failed)}")
        for table in tables_failed:
            print(f"  ✗ {table}")
        print("\n" + "="*60)
        sys.exit(1)
    else:
        print("\nAll tables created successfully!")
        print("="*60)
        sys.exit(0)


if __name__ == "__main__":
    main()
