"""
Main script to create all vector/polygon tables.
This script orchestrates the creation of various polygon layer tables from GeoJSON data.
"""
import sys
from creatVectorTables import create_admin_boundaries_tables


def main():
    """
    Main function to create all vector tables.
    """
    print("\n" + "="*60)
    print("Creating All Vector Tables")
    print("="*60 + "\n")
    
    # Track success/failure
    tables_created = []
    tables_failed = []
    
    # Create Admin Boundaries table
    try:
        print("\n[1/1] Creating Admin Boundaries table...")
        create_admin_boundaries_tables()
        tables_created.append("admin_boundaries")
    except Exception as e:
        print(f"ERROR: Failed to create admin_boundaries table: {e}")
        import traceback
        traceback.print_exc()
        tables_failed.append("admin_boundaries")
    
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
