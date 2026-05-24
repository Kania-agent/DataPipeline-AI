# 🔄 DataPipeline-AI

> Intelligent ETL pipeline powered by MiMo V2.5

## Why This Exists

Data engineering teams spend countless hours wrangling brittle ETL scripts that break the moment a schema changes or a new data source is added. Traditional pipelines require manual configuration for every transformation rule, every schema mapping, and every destination connector — leading to maintenance nightmares as data volumes grow.

DataPipeline-AI replaces rigid, rule-based ETL with an intelligent agent that **understands your data semantically**. Powered by MiMo V2.5's reasoning capabilities, it automatically detects schema drift, infers transformation logic from sample records, and self-heals when upstream sources change their format. The pipeline doesn't just move data — it *understands* it.

Whether you're consolidating warehouse data from dozens of SaaS APIs, streaming real-time events into a lakehouse, or migrating legacy databases, DataPipeline-AI adapts to your data landscape without manual intervention. It handles schema evolution, quality validation, and incremental loading — all orchestrated by a single reasoning agent.

## Architecture

```
┌─────────────┐     ┌───────────┐     ┌──────────────┐     ┌────────┐     ┌──────────┐
│   SOURCES   │────▶│  EXTRACT  │────▶│  TRANSFORM   │────▶│  LOAD  │────▶│ TARGETS  │
│             │     │           │     │              │     │        │     │          │
│ • REST APIs │     │ • Schema  │     │ • Enrich     │     │ • Bulk │     │ • Snow-  │
│ • Databases │     │   Detect  │     │ • Dedup      │     │   Load │     │   flake  │
│ • Files     │     │ • Fetch   │     │ • Validate   │     │ • Upsert│    │ • BigQ   │
│ • Streams   │     │ • Decode  │     │ • Aggregate  │     │ • Merge│     │ • S3/Red  │
└─────────────┘     └───────────┘     └──────────────┘     └────────┘     └──────────┘

    MiMo V2.5 Agent orchestrates all stages with adaptive reasoning
```

## Token Consumption Model

| Stage | Description | Tokens/Run | Avg Latency | Cost Estimate |
|-------|-------------|------------|-------------|---------------|
| **Extract** | Source discovery, schema detection, data fetching | 200K | 12s | $0.08 |
| **Transform** | Semantic mapping, quality checks, enrichment, aggregation | 400K | 28s | $0.16 |
| **Load** | Target schema matching, upsert logic, conflict resolution | 150K | 8s | $0.06 |
| **Total** | End-to-end pipeline execution | **750K** | **48s** | **$0.30** |

*Token estimates based on a typical 10K-record pipeline run. Scales linearly with record volume.*

## Features

- **Auto Schema Detection** — Automatically discovers and tracks source schemas without manual configuration
- **Semantic Transformations** — MiMo V2.5 reasons about field semantics to infer correct mappings and transformations
- **Incremental Loading** — Tracks watermarks and only processes new or changed records
- **Data Quality Gates** — Validates records at every stage with configurable quality rules
- **Self-Healing Pipelines** — Detects schema drift and adapts transformation logic autonomously
- **Multi-Format Support** — Ingests JSON, CSV, Parquet, Avro, XML, and streaming formats
- **Parallel Execution** — Concurrent extraction and transformation across multiple sources
- **Observability Dashboard** — Real-time metrics, lineage tracking, and alerting
- **Dead Letter Queue** — Captures failed records for inspection without halting the pipeline
- **Version Control** — Full pipeline versioning with rollback support

## Tech Stack

- **Runtime**: Python 3.11+
- **Agent Engine**: MiMo V2.5 (Nous Research)
- **Orchestration**: Apache Airflow 2.8
- **Processing**: Apache Spark 3.5 / Polars
- **Storage**: Delta Lake / Apache Iceberg
- **Connectors**: SQLAlchemy, boto3, httpx
- **Serialization**: Apache Avro, Parquet, Protocol Buffers
- **Monitoring**: OpenTelemetry, Prometheus, Grafana
- **Container Runtime**: Docker, Kubernetes

## Quick Start

```bash
# Install dependencies
pip install datapipeline-ai

# Initialize a new pipeline project
datapipeline init my-etl-project
cd my-etl-project

# Configure your sources in config.yaml
cat > config.yaml << 'EOF'
sources:
  - type: postgresql
    host: localhost
    database: analytics
    tables: [users, orders]
  - type: rest_api
    url: https://api.example.com/v2/events
    auth: bearer

targets:
  - type: snowflake
    account: myorg
    warehouse: COMPUTE_WH
    database: DWH
EOF

# Run the pipeline
datapipeline run --config config.yaml --verbose

# Schedule with Airflow
datapipeline airflow-export --dag-id daily_etl
```

## Project Structure

```
DataPipeline-AI/
├── README.md
├── pyproject.toml
├── config.yaml
├── src/
│   ├── __init__.py
│   ├── agent/
│   │   ├── orchestrator.py      # MiMo V2.5 agent loop
│   │   ├── planner.py           # Pipeline stage planning
│   │   └── reasoner.py          # Schema reasoning engine
│   ├── extract/
│   │   ├── base.py              # Abstract extractor
│   │   ├── rest_api.py          # REST/GraphQL connectors
│   │   ├── database.py          # JDBC/SQL sources
│   │   └── stream.py            # Kafka/Kinesis consumers
│   ├── transform/
│   │   ├── mapper.py            # Field mapping engine
│   │   ├── validator.py         # Data quality checks
│   │   ├── enricher.py          # External enrichment
│   │   └── aggregator.py        # Rollup logic
│   ├── load/
│   │   ├── base.py              # Abstract loader
│   │   ├── warehouse.py         # Data warehouse loader
│   │   ├── lake.py              # Data lake writer
│   │   └── stream.py            # Stream sink
│   └── utils/
│       ├── schema_tracker.py    # Schema versioning
│       ├── watermark.py         # Incremental tracking
│       └── metrics.py           # Observability
├── tests/
│   ├── test_extract.py
│   ├── test_transform.py
│   ├── test_load.py
│   └── test_integration.py
├── dags/
│   └── daily_etl.py             # Airflow DAG definition
└── Dockerfile
```

---

> Built with MiMo V2.5 — [Nous Research](https://nousresearch.com)
