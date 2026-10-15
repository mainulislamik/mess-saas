import re
from typing import List, Dict, Any

# Common bangla numeral mapping
BANGLA_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")

def normalize_numbers(text: str) -> str:
    return text.translate(BANGLA_DIGITS)

def parse_bazar_text(raw_text: str) -> Dict[str, Any]:
    """
    Parses natural language bazar memos in Bangla or English.
    Examples:
      'আলু ৬০, ডিম ১৩০, পেঁয়াজ ১০০, সয়াবিন তেল ২২০, মুরগি ৩৫০'
      'alu 60\ndim 130\npeyaj 100 টাকা'
      '১ ডজন ডিম ১৫০ টাকা, ২ কেজি আলু ৮০'
    """
    if not raw_text:
        return {"items": [], "total_amount": 0.0, "formatted_description": ""}

    cleaned_text = normalize_numbers(raw_text)
    
    # Split by comma, newline, plus, semicolon
    raw_tokens = re.split(r'[,+\n;\r]+', cleaned_text)
    items: List[Dict[str, Any]] = []

    for token in raw_tokens:
        tok = token.strip()
        if not tok:
            continue
        
        # Remove currency symbols or words like টাকা, tk, /-, =
        tok_clean = re.sub(r'(?:টাকা|ট\b|tk|taka|/-)', '', tok, flags=re.IGNORECASE).strip()

        # Pattern 1: Item name followed by amount -> e.g. "আলু 60" or "আলু - 60" or "ডিম = 140"
        m1 = re.search(r'^([^\d]+?)\s*[-:=]?\s*(\d+(?:\.\d+)?)\s*$', tok_clean)
        if m1:
            name = m1.group(1).strip(" -:=.,")
            amt = float(m1.group(2))
            if name and amt > 0:
                items.append({"item": name, "amount": amt})
                continue

        # Pattern 2: Amount followed by item -> e.g. "150 dim" or "60 alu"
        m2 = re.search(r'^\s*(\d+(?:\.\d+)?)\s*[-:=]?\s*([^\d]+?)$', tok_clean)
        if m2:
            amt = float(m2.group(1))
            name = m2.group(2).strip(" -:=.,")
            if name and amt > 0:
                items.append({"item": name, "amount": amt})
                continue

        # Pattern 3: Embedded pattern inside text -> e.g. "২ কেজি আলু ৮০"
        m3 = re.search(r'(.*?)\s*[-:=]?\s*(\d+(?:\.\d+)?)\s*$', tok_clean)
        if m3 and m3.group(1).strip():
            name = m3.group(1).strip(" -:=.,")
            amt = float(m3.group(2))
            if name and amt > 0:
                items.append({"item": name, "amount": amt})
                continue

    total = sum(i["amount"] for i in items)
    formatted = ", ".join(f"{i['item']} (৳{int(i['amount']) if i['amount'].is_integer() else i['amount']})" for i in items)

    return {
        "items": items,
        "total_amount": round(total, 2),
        "formatted_description": formatted,
    }
