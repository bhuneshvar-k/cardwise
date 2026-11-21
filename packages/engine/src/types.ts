import type { Category, PaymentMethod, UserAttribute } from './schema';

/** ISO calendar date, `YYYY-MM-DD`, in the user's local time zone. */
export type IsoDate = string;

export interface Purchase {
  merchantId?: string;
  merchantTags?: readonly string[];
  category: Category;
  mcc?: number;
  paymentMethod: PaymentMethod;
  /** Unknown amounts rank by rate using a reference amount. */
  amountPaise?: number;
  emi?: boolean;
  date: IsoDate;
}

/** The user's own copy of a card product. Never holds card numbers. */
export interface UserCard {
  id: string;
  cardId: string;
  nickname?: string;
  attributes?: Partial<Record<UserAttribute, boolean>>;
  issuedOn?: IsoDate;
  /** Day of month the statement is generated (1–28). Needed for statement-cycle caps. */
  statementDay?: number;
  redemptionId?: string;
  /** User's own value for one reward unit, in paise. Wins over the redemption value. */
  paisePerUnitOverride?: number;
}

/** Units already used this period, keyed by cap id. `WAIVER_USAGE_KEY` holds waiver paise. */
export type CapUsage = Readonly<Record<string, number>>;

export interface CapStatus {
  capId: string;
  label: string;
  maxUnits: number;
  remainingBefore: number;
  remainingAfter: number;
}

export interface Allocation {
  capId: string;
  units: number;
}

export interface Evaluation {
  userCardId: string;
  cardId: string;
  cardName: string;
  eligible: boolean;
  ineligibleReason?: string;
  ruleId?: string;
  ruleLabel?: string;
  excludedBy?: string;
  rewardUnits: number;
  unitLabel: string;
  rewardValuePaise: number;
  waiverPaise: number;
  totalValuePaise: number;
  /** Total value as basis points of the amount. */
  effectiveBps: number;
  amountPaise: number;
  amountAssumed: boolean;
  caps: CapStatus[];
  allocations: Allocation[];
  explanation: string[];
  warnings: string[];
}

export interface SpendLog {
  id: string;
  userCardId: string;
  date: IsoDate;
  amountPaise: number;
  allocations: readonly Allocation[];
  waiverPaise?: number;
  deletedAt?: string | null;
}
