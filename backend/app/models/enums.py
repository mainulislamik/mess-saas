from enum import Enum

class MemberRole(str, Enum):
    OWNER = "owner"
    MANAGER = "manager"
    MEMBER = "member"

class PlanType(str, Enum):
    FREE = "free"
    PRO = "pro"

class DepositMethod(str, Enum):
    CASH = "cash"
    BKASH = "bkash"
    NAGAD = "nagad"
    ROCKET = "rocket"
    BANK = "bank"
    OTHER = "other"

class FixedCostCategory(str, Enum):
    RENT = "rent"
    GAS = "gas"
    WATER = "water"
    ELECTRICITY = "electricity"
    WIFI = "wifi"
    COOK_MAID = "cook_maid"
    WASTE = "waste"
    OTHER = "other"

class SplitType(str, Enum):
    EQUAL = "equal"
    CUSTOM = "custom"
