# Supabase Setup

## Datenbank

Im Supabase Dashboard → SQL Editor das Schema ausführen:

```
../stacktactoe-database.sql
```

## Edge Functions (optional)

Matchmaking läuft über die RPC `join_matchmaking_queue` – der Client kann direkt `supabase.rpc('join_matchmaking_queue', { p_queue_type: 'ranked' })` aufrufen.

Falls du die Edge Function nutzen willst (z.B. für zentrale Logs oder Rate-Limiting):

```bash
supabase login
supabase link --project-ref DEIN_PROJECT_REF
supabase functions deploy matchmaking
```

Die Function ist ein dünner Wrapper um die RPC.
