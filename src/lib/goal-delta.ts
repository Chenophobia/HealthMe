export type GoalDirection = "increase" | "decrease";

export interface GoalStatusInput {
  direction: GoalDirection;
  currentValue: number;
  targetValue: number;
  projectedValue: number;
  targetDate: Date;
  today: Date;
}

export interface GoalStatusResult {
  onTrack: boolean;
  reached: boolean;
  delta: number;
}

export function goalStatus(i: GoalStatusInput): GoalStatusResult {
  const reached =
    i.direction === "decrease" ? i.currentValue <= i.targetValue : i.currentValue >= i.targetValue;
  const onTrack =
    i.direction === "decrease"
      ? i.projectedValue <= i.targetValue
      : i.projectedValue >= i.targetValue;
  const delta = +(i.projectedValue - i.targetValue).toFixed(3);
  return { onTrack, reached, delta };
}
