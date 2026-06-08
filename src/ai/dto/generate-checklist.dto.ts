import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const primaryGoalOptions = [
  'Become consistently profitable',
  'Reduce losses / drawdown',
  'Build a repeatable strategy',
  'Improve risk management',
  'Control emotions and discipline',
] as const;

export const marketFocusOptions = [
  'Stocks',
  'Crypto',
  'Forex',
  'Futures',
  'Options',
  'Mixed / still exploring',
] as const;

export const experienceLevelOptions = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Prop-firm / funded challenge',
  'Returning after a break',
] as const;

export const tradingStyleOptions = [
  'Scalping',
  'Day trading',
  'Swing trading',
  'Position trading',
  'Still finding my style',
] as const;

export const biggestChallengeOptions = [
  'Revenge trading',
  'Overtrading',
  'Oversizing positions',
  'Poor exits',
  'Breaking my own rules',
  'No clear journal or review process',
] as const;

export const tradingContextOptions = [
  'Small account',
  'Full-time job, limited screen time',
  'Recovering from a losing streak',
  'Preparing for a funded challenge',
  'Testing a new strategy',
  'I need structure and consistency',
] as const;

export class GenerateChecklistDto {
  @IsIn(primaryGoalOptions)
  primaryGoal!: string;

  @IsIn(marketFocusOptions)
  marketFocus!: string;

  @IsIn(experienceLevelOptions)
  experienceLevel!: string;

  @IsIn(tradingStyleOptions)
  tradingStyle!: string;

  @IsIn(biggestChallengeOptions)
  biggestChallenge!: string;

  @IsIn(tradingContextOptions)
  tradingContext!: string;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  additionalContext?: string;
}
