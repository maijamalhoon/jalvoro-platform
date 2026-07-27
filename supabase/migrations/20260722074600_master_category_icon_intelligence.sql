begin;

-- Master category visual intelligence. This stays deterministic and database-local:
-- no network or AI request is needed while a category is typed or saved.
create or replace function public.infer_category_icon_key(
  p_category_name text,
  p_category_type text
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when coalesce(p_category_name, '') ~* 'salary|salery|sallery|payroll|wage|tankh.?wa|tankha|maash' then 'salary'
    when coalesce(p_category_name, '') ~* 'pension|retirement|provident|gratuity|allowance|stipend' then 'banknote'
    when coalesce(p_category_name, '') ~* 'freelance|client work|gig|consult|office|workspace' then 'briefcase'
    when coalesce(p_category_name, '') ~* 'business|karobar|dukaan|shop income|trade income|factory|manufactur' then 'store'
    when coalesce(p_category_name, '') ~* 'commission|comission|brokerage|tip income|tips received|affiliate|referral income|partnership|joint venture' then 'handCoins'
    when coalesce(p_category_name, '') ~* 'bonus|bounus|incentive|reward|eidi|cash.?back|rebate' then 'bonus'
    when coalesce(p_category_name, '') ~* 'profit|munafa|return|capital gain|dividend|stock income|share income|investment|mutual fund|stock|shares|portfolio|farming income|farm income|crop sale|agriculture income' then 'growth'
    when coalesce(p_category_name, '') ~* 'interest income|markup received|yield|crypto|bitcoin|ethereum|usdt|blockchain' then 'coins'
    when coalesce(p_category_name, '') ~* 'rent income|rental income|property income|real estate income' then 'building'
    when coalesce(p_category_name, '') ~* 'refund|reimbursement|money back' then 'receipt'
    when coalesce(p_category_name, '') ~* 'grant|scholarship|education support' then 'education'
    when coalesce(p_category_name, '') ~* 'donation received|charity received|support received' then 'gift'

    when coalesce(p_category_name, '') ~* 'house rent|home rent|rent|kiraya|mortgage|lease|property|plot|apartment|flat' then 'home'
    when coalesce(p_category_name, '') ~* 'grocery|groceries|rashan|ration|supermarket|fruit|vegetable|sabzi|milk|dairy|doodh' then 'groceries'
    when coalesce(p_category_name, '') ~* 'food|dining|restaurant|meal|khana|nashta|lunch|dinner|coffee|chai|tea|cafe|pizza|burger|fast food|takeaway|bakery' then 'dining'
    when coalesce(p_category_name, '') ~* 'electricity|electric|bijli|power bill|light bill|solar|solar panel' then 'power'
    when coalesce(p_category_name, '') ~* 'water|pani|water bill' then 'water'
    when coalesce(p_category_name, '') ~* 'internet|wi-?fi|broadband|fiber|net bill' then 'internet'
    when coalesce(p_category_name, '') ~* 'mobile|phone|cell|smartphone|sim|load|recharge' then 'phone'
    when coalesce(p_category_name, '') ~* 'gas bill|sui gas|utility bill|utilities|kitchen|cookware|utensil' then 'utilities'

    when coalesce(p_category_name, '') ~* 'fuel|petrol|diesel|gasoline|cng' then 'fuel'
    when coalesce(p_category_name, '') ~* 'bike|bicycle|cycle|motorbike|motorcycle' then 'bike'
    when coalesce(p_category_name, '') ~* 'bus|coach|public transport' then 'bus'
    when coalesce(p_category_name, '') ~* 'train|rail|metro|subway' then 'train'
    when coalesce(p_category_name, '') ~* 'taxi|cab|ride|uber|careem|indrive|rickshaw|riksha|transport|car|gaari|gari|vehicle|parking|toll|motorway' then 'car'
    when coalesce(p_category_name, '') ~* 'flight|airline|air ticket|plane|travel|trip|tour|vacation|holiday|safar|hotel|motel|hostel|guest house|visa|passport' then 'travel'
    when coalesce(p_category_name, '') ~* 'ticket|entry pass|event pass' then 'ticket'

    when coalesce(p_category_name, '') ~* 'medicine|medication|pharmacy|drug|dawa|dawai|tablet' then 'medical'
    when coalesce(p_category_name, '') ~* 'medical|doctor|health|hospital|clinic|ilaaj|treatment|dental|dentist|eye|glasses|optical|insurance|takaful' then 'health'
    when coalesce(p_category_name, '') ~* 'school fee|college fee|university fee|tuition|academy|education|school|college|university|course|taleem|training|language' then 'education'
    when coalesce(p_category_name, '') ~* 'book|books|stationery|notebook|kitab|library|reading' then 'books'

    when coalesce(p_category_name, '') ~* 'baby|child|children|kid|bacha|bachay|daycare|nursery|family' then 'children'
    when coalesce(p_category_name, '') ~* 'pet|animal|vet|veterinary|dog|puppy|cat|kitten' then 'pets'
    when coalesce(p_category_name, '') ~* 'cloth|clothing|fashion|shirt|kapra|kapray|dress|shoe|footwear|sneaker|sandal|salon|barber|haircut|spa|grooming|beauty|cosmetic|makeup|skincare|perfume' then 'clothing'
    when coalesce(p_category_name, '') ~* 'gym|fitness|workout|exercise|sport|cricket|football|tennis|badminton' then 'fitness'
    when coalesce(p_category_name, '') ~* 'game|gaming|playstation|xbox|movie|cinema|film|netflix|music|spotify|concert|subscription|membership' then 'games'

    when coalesce(p_category_name, '') ~* 'software|app|saas|domain|hosting|cloud|laptop|computer|desktop|notebook|(^|[^a-z])pc([^a-z]|$)|electronics|monitor|screen|keyboard|mouse|printer|camera' then 'laptop'
    when coalesce(p_category_name, '') ~* 'furniture|sofa|bed|table|chair|appliance|washing machine|fridge|refrigerator|oven|cleaning|housekeeping|maid|domestic help' then 'home'
    when coalesce(p_category_name, '') ~* 'home repair|house repair|plumber|electrician|marammat|car repair|bike repair|mechanic|workshop|maintenance|service|construction|renovation|cement|paint work|mistri|labour|labor|mazdoori|tool|hardware|equipment' then 'repair'
    when coalesce(p_category_name, '') ~* 'garden|gardening|plant|nursery|lawn|farm|farming|agriculture|seed|fertilizer|crop' then 'growth'
    when coalesce(p_category_name, '') ~* 'delivery|courier|shipping|freight|parcel|package|packaging|box' then 'package'
    when coalesce(p_category_name, '') ~* 'shopping|shop|purchase|mall|saman|market|store|retail' then 'shopping'

    when coalesce(p_category_name, '') ~* 'gift|present|tohfa|birthday|anniversary|party|celebration|wedding|shadi|marriage|charity|donation|sadqa|sadaqah|khairat|zakat' then 'gift'
    when coalesce(p_category_name, '') ~* 'tax|income tax|property tax|sales tax|bank fee|bank charge|atm fee|service fee' then 'tax'
    when coalesce(p_category_name, '') ~* 'loan|credit|debt|qarz|udhar|finance payment|credit card|card payment' then 'credit'
    when coalesce(p_category_name, '') ~* 'committee|saving committee|bisi|saving|savings|deposit|reserve|emergency fund' then 'savings'
    when coalesce(p_category_name, '') ~* 'transfer|send money|remittance' then 'transfer'
    when coalesce(p_category_name, '') ~* 'cash|wallet|atm withdrawal' then 'wallet'
    when coalesce(p_category_name, '') ~* 'bank|account|legal|lawyer|advocate|court|security|guard|cctv|alarm' then 'bank'
    when coalesce(p_category_name, '') ~* 'fee|charge|expense|other expense|misc' then 'receipt'
    when coalesce(p_category_name, '') ~* 'income|earning|kamai|amdani|other income' then 'cash'
    when p_category_type = 'income' then 'cash'
    else 'receipt'
  end;
$$;

-- Refresh icon metadata only. IDs, names, colours, relationships, amounts and
-- all financial history remain unchanged.
update public.categories
set icon_key = public.infer_category_icon_key(name, type)
where icon_key is distinct from public.infer_category_icon_key(name, type);

commit;
