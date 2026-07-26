# Command Center authentication module

This module owns the one visible `/commandcenter` authentication entry.

It must not import the retired Control Plane UI or require a second user-visible authentication step. The dedicated Supabase project validates the Command Center account; the production website session is established silently through the bounded session bridge so the existing operational data and authorization contracts remain authoritative.
