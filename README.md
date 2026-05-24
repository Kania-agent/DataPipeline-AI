# DataPipeline-AI

An intelligent ETL (Extract, Transform, Load) pipeline visualization tool powered by **MiMo V2.5**.

## Features

- Interactive node-based pipeline diagram
- Real-time flow visualization with animated data paths
- Status indicators for each pipeline stage (idle, running, complete, error)
- Drag-and-drop pipeline configuration
- Data throughput metrics and monitoring
- Log viewer for pipeline execution details

## Tech Stack

- Vanilla HTML5, CSS3, JavaScript (ES6+)
- Canvas-based node rendering
- CSS Grid layout for dashboard panels
- Zero dependencies

## Getting Started

1. Open `index.html` in a modern web browser
2. Click "Start Pipeline" to see the ETL flow in action
3. Hover over nodes to inspect stage details
4. Use the sidebar to toggle pipeline stages on/off

## Architecture

The app simulates a real ETL pipeline with:
- **Extract** nodes: Database, API, File sources
- **Transform** nodes: Filter, Map, Aggregate, Join
- **Load** nodes: Data Warehouse, Cache, Analytics

Built with MiMo V2.5 AI assistance.
