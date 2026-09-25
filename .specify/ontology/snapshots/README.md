# Domain snapshots

`domain.snapshot.json` is the extract used by `generate_ontology.py`.
Regenerate via:

```bash
python3 .specify/scripts/extract_domain_snapshot.py
python3 .specify/scripts/generate_ontology.py
```

Do not hand-edit generated TTL/enums; edit snapshot sources / curated axioms instead.
