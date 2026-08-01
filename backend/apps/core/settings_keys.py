# Central registry of apps.core.StudioSetting keys and their fallback
# defaults, so no app hardcodes a magic string or a bare number. Add new
# studio-wide settings here as they're introduced in future phases.

SLOT_GENERATION_HORIZON_DAYS = 'slot_generation_horizon_days'

SLOT_GENERATION_HORIZON_DAYS_DEFAULT = 30
SLOT_GENERATION_HORIZON_DAYS_MIN = 7
SLOT_GENERATION_HORIZON_DAYS_MAX = 365

SINGLE_SLOT_PRICE = 'single_slot_price'
SINGLE_SLOT_PRICE_DEFAULT = '150.00'
