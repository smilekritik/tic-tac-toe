# Tic-Tac-Toe Backend

## API Documentation

### REST API (OpenAPI/Swagger)

After starting the server, access the interactive API documentation at:

- **Swagger UI**: http://localhost:5000/api-docs
- **OpenAPI JSON**: http://localhost:5000/api-docs.json

### WebSocket API (AsyncAPI)

For real-time matchmaking and gameplay events:

- **AsyncAPI Docs**: http://localhost:5000/asyncapi-docs

## Documentation Structure

```
src/docs/
├── openapi.js              # OpenAPI configuration (imports routes/*.yaml)
├── asyncapi-generator.js   # AsyncAPI HTML generator (imports websocket/*.yaml)
├── asyncapi-docs.css       # Swagger-like dark theme styles
├── asyncapi-docs.js        # Interactive collapsible sections
├── routes/                 # REST API documentation (OpenAPI)
│   ├── auth.yaml
│   ├── me.yaml
│   ├── users.yaml
│   └── game.yaml
└── websocket/              # WebSocket API documentation (AsyncAPI)
    ├── authentication.yaml
    ├── matchmaking.yaml
    ├── gameplay.yaml
    ├── errors.yaml
    └── info.yaml
```

## Documentation Standards

- **REST endpoints** → OpenAPI 3.1 via `routes/*.yaml` (Swagger UI)
- **WebSocket events** → Custom format via `websocket/*.yaml` (Swagger-like viewer)
- **Modular approach** → Each feature in separate YAML file
- **Dynamic generation** → HTML generated from YAML on request