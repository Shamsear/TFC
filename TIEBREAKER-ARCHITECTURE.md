# Tiebreaker Live Update Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     TIEBREAKER LIVE UPDATE SYSTEM                │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐                    ┌──────────────────────┐
│   TEAM MANAGER A     │                    │   TEAM MANAGER B     │
│  (Browser Client)    │                    │  (Browser Client)    │
└──────────┬───────────┘                    └──────────┬───────────┘
           │                                           │
           │ Pol