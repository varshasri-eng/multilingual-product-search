# ER Diagram (Version 1)

This renders automatically on GitHub — no image tool needed. Matches the schema in `database/schema.sql` and is documented in detail in `docs/database_design.md`.

```mermaid
erDiagram
    CATEGORIES ||--o{ PRODUCTS : contains
    PRODUCTS ||--o{ PRODUCT_IMAGES : has
    PRODUCTS ||--o{ SEARCH_TERMS : "searchable by"
    PRODUCTS ||--o{ SEARCH_LOGS : "resolved to"
    PRODUCTS ||--o{ RELATED_PRODUCTS : "related to"

    CATEGORIES {
        int category_id PK
        varchar category_name
        text description
    }

    PRODUCTS {
        int product_id PK
        int category_id FK
        varchar product_name
        varchar scientific_name
        text description
        decimal price
        int stock_quantity
        text image_url
        timestamp created_at
    }

    PRODUCT_IMAGES {
        int image_id PK
        int product_id FK
        text image_url
        boolean is_primary
        timestamp created_at
    }

    SEARCH_TERMS {
        int search_term_id PK
        int product_id FK
        varchar search_term
        varchar term_type "official | alias | regional | typo | hashtag"
        varchar language
        timestamp created_at
    }

    SEARCH_LOGS {
        int log_id PK
        varchar search_query
        int matched_product_id FK
        boolean result_found
        timestamp searched_at
    }

    RELATED_PRODUCTS {
        int related_id PK
        int product_id FK
        int related_product_id FK
        varchar relation_type
    }
```

## Notes on relationships

- **CATEGORIES → PRODUCTS**: one category holds many products.
- **PRODUCTS → SEARCH_TERMS**: the core relationship — one product has many searchable names (official, alias, regional, typo, hashtag), which is what enables fuzzy/multilingual search without a single fixed product title.
- **PRODUCTS → SEARCH_LOGS**: every search a customer runs is logged, optionally resolving to a product. `result_found = false` rows are the signal for missing aliases.
- **PRODUCTS → RELATED_PRODUCTS**: self-referencing — powers fallback suggestions when a search doesn't resolve.
- **PRODUCTS → PRODUCT_IMAGES**: one product, many images — needed for future image-based search (CLIP embeddings, planned per `docs/architecture.md`).
