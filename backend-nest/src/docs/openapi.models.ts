import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorBodyDto {
  @ApiProperty({ example: 'SOMETHING_WRONG' })
  code!: string;
}

export class ValidationErrorBodyDto extends ErrorBodyDto {
  @ApiPropertyOptional({ example: 'Validation failed' })
  message?: string;

  @ApiPropertyOptional({
    additionalProperties: {
      type: 'array',
      items: { type: 'string' },
    },
    example: {
      email: ['Email is invalid'],
    },
  })
  fields?: Record<string, string[]>;
}

export class ErrorEnvelopeDto {
  @ApiProperty({ type: ErrorBodyDto })
  error!: ErrorBodyDto;
}

export class ValidationErrorEnvelopeDto {
  @ApiProperty({ type: ValidationErrorBodyDto })
  error!: ValidationErrorBodyDto;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message!: string;
}

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'player-one' })
  username!: string;

  @ApiProperty({ enum: ['user', 'admin', 'superadmin'], example: 'user' })
  role!: 'user' | 'admin' | 'superadmin';
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}

export class RefreshResponseDto {
  @ApiProperty()
  accessToken!: string;
}

export class UsernameAvailabilityResponseDto {
  @ApiProperty({ example: 'player-one' })
  username!: string;

  @ApiProperty({ example: true })
  available!: boolean;
}

export class GameModeDto {
  @ApiProperty({ example: 'classic' })
  code!: string;

  @ApiProperty({ example: 'Classic 3x3' })
  name!: string;
}

export class HydratedRatingDto {
  @ApiProperty({ example: 1000 })
  eloRating!: number;

  @ApiProperty({ example: 12 })
  gamesPlayed!: number;

  @ApiProperty({ example: 7 })
  wins!: number;

  @ApiProperty({ example: 3 })
  losses!: number;

  @ApiProperty({ example: 2 })
  draws!: number;

  @ApiProperty({ example: 4 })
  winStreak!: number;

  @ApiProperty({ example: 5 })
  maxWinStreak!: number;

  @ApiProperty({ type: GameModeDto })
  gameMode!: GameModeDto;
}

export class UserProfileDto {
  @ApiPropertyOptional({ nullable: true, example: '/uploads/avatar_abc123.png' })
  avatarPath!: string | null;

  @ApiProperty({ example: 'en' })
  preferredLanguage!: string;

  @ApiProperty({ example: true })
  chatEnabledDefault!: boolean;

  @ApiProperty({ example: true })
  publicProfileEnabled!: boolean;

  @ApiPropertyOptional({ format: 'date-time' })
  createdAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  updatedAt?: string;
}

export class CurrentUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email', example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'player-one' })
  username!: string;

  @ApiProperty({ example: true })
  emailVerified!: boolean;

  @ApiProperty({ enum: ['user', 'admin', 'superadmin'], example: 'user' })
  role!: 'user' | 'admin' | 'superadmin';

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  emailVerificationDeadlineAt!: string | null;

  @ApiProperty({ type: UserProfileDto })
  profile!: UserProfileDto;

  @ApiProperty({ type: HydratedRatingDto, isArray: true })
  ratings!: HydratedRatingDto[];
}

export class PublicUserProfileSettingsDto {
  @ApiPropertyOptional({ nullable: true, example: '/uploads/avatar_abc123.png' })
  avatarPath!: string | null;

  @ApiProperty({ example: true })
  publicProfileEnabled!: boolean;
}

export class PublicUserProfileDto {
  @ApiProperty({ example: 'player-one' })
  username!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: PublicUserProfileSettingsDto })
  profile!: PublicUserProfileSettingsDto;

  @ApiProperty({ type: HydratedRatingDto, isArray: true })
  ratings!: HydratedRatingDto[];
}

export class AvatarUploadResponseDto {
  @ApiPropertyOptional({ nullable: true, example: '/uploads/avatar_abc123.png' })
  avatarPath!: string | null;
}

export class UserIdentityDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'player-one' })
  username!: string;
}

export class MatchHistoryOpponentDto {
  @ApiProperty({ example: 'opponent-player' })
  username!: string;

  @ApiPropertyOptional({ nullable: true, example: '/uploads/avatar_abc123.png' })
  avatarPath!: string | null;
}

export class MatchHistoryItemDto {
  @ApiProperty({ format: 'uuid' })
  matchId!: string;

  @ApiProperty({ type: GameModeDto })
  gameMode!: GameModeDto;

  @ApiProperty({ example: 'ranked' })
  matchType!: string;

  @ApiProperty({ type: MatchHistoryOpponentDto })
  opponent!: MatchHistoryOpponentDto;

  @ApiProperty({ enum: ['win', 'loss', 'draw'], example: 'win' })
  result!: 'win' | 'loss' | 'draw';

  @ApiPropertyOptional({ nullable: true, example: 'timeout' })
  resultType!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  startedAt!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  finishedAt!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 183 })
  durationSeconds!: number | null;

  @ApiProperty({ example: 9 })
  moveCount!: number;

  @ApiPropertyOptional({ nullable: true, example: 14 })
  ratingDelta!: number | null;
}

export class MatchHistoryResponseDto {
  @ApiProperty({ type: MatchHistoryItemDto, isArray: true })
  items!: MatchHistoryItemDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 24 })
  total!: number;

  @ApiProperty({ example: true })
  hasMore!: boolean;
}

export class MatchPlayerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'player-one' })
  username!: string;

  @ApiPropertyOptional({ nullable: true, example: '/uploads/avatar_abc123.png' })
  avatarPath!: string | null;
}

export class MatchWinnerDto {
  @ApiProperty({ example: 'player-one' })
  username!: string;
}

export class MatchMoveDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 1 })
  moveNumber!: number;

  @ApiProperty({ format: 'uuid' })
  playerId!: string;

  @ApiProperty({ enum: ['X', 'O'], example: 'X' })
  symbol!: 'X' | 'O';

  @ApiProperty({ example: 0 })
  positionX!: number;

  @ApiProperty({ example: 2 })
  positionY!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class MatchFinalStateDto {
  @ApiProperty({
    type: 'array',
    items: {
      oneOf: [
        { type: 'string', enum: ['X', 'O'] },
        { type: 'null' },
      ],
    },
    example: ['X', 'O', 'X', null, 'O', null, null, null, 'X'],
  })
  board!: Array<'X' | 'O' | null>;
}

export class MatchDetailsResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ranked' })
  matchType!: string;

  @ApiProperty({ example: 'finished' })
  status!: string;

  @ApiPropertyOptional({ nullable: true, example: 'win' })
  resultType!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  startedAt!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  finishedAt!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 183 })
  durationSeconds!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 14 })
  ratingDeltaX!: number | null;

  @ApiPropertyOptional({ nullable: true, example: -14 })
  ratingDeltaO!: number | null;

  @ApiProperty({ type: GameModeDto })
  gameMode!: GameModeDto;

  @ApiProperty({ type: MatchPlayerDto })
  playerX!: MatchPlayerDto;

  @ApiProperty({ type: MatchPlayerDto })
  playerO!: MatchPlayerDto;

  @ApiPropertyOptional({ type: MatchWinnerDto, nullable: true })
  winner!: MatchWinnerDto | null;

  @ApiProperty({ type: MatchMoveDto, isArray: true })
  moves!: MatchMoveDto[];

  @ApiProperty({ type: MatchFinalStateDto })
  finalState!: MatchFinalStateDto;

  @ApiPropertyOptional({
    nullable: true,
    type: 'array',
    items: { type: 'number' },
    example: [0, 4, 8],
  })
  winLine!: [number, number, number] | null;
}

export class LeaderboardCategoryDto {
  @ApiProperty({ example: 'classic' })
  code!: string;

  @ApiProperty({ example: 'Classic 3x3' })
  name!: string;
}

export class LeaderboardEntryDto {
  @ApiProperty({ example: 1 })
  rank!: number;

  @ApiProperty({ example: false })
  isCurrentUser!: boolean;

  @ApiProperty({ example: 'player-one' })
  username!: string;

  @ApiPropertyOptional({ nullable: true, example: '/uploads/avatar_abc123.png' })
  avatarPath!: string | null;

  @ApiProperty({ example: 1325 })
  eloRating!: number;

  @ApiProperty({ example: 24 })
  gamesPlayed!: number;

  @ApiProperty({ example: 16 })
  wins!: number;

  @ApiProperty({ example: 5 })
  losses!: number;

  @ApiProperty({ example: 3 })
  draws!: number;

  @ApiProperty({ example: 6 })
  winStreak!: number;

  @ApiProperty({ example: 8 })
  maxWinStreak!: number;
}

export class LeaderboardResponseDto {
  @ApiProperty({ type: LeaderboardCategoryDto, isArray: true })
  categories!: LeaderboardCategoryDto[];

  @ApiPropertyOptional({ type: LeaderboardCategoryDto, nullable: true })
  mode!: LeaderboardCategoryDto | null;

  @ApiProperty({ type: LeaderboardEntryDto, isArray: true })
  entries!: LeaderboardEntryDto[];
}

export class ActiveMatchResponseDto {
  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  matchId!: string | null;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;
}

export const OPENAPI_EXTRA_MODELS = [
  ErrorBodyDto,
  ValidationErrorBodyDto,
  ErrorEnvelopeDto,
  ValidationErrorEnvelopeDto,
  MessageResponseDto,
  AuthUserDto,
  LoginResponseDto,
  RefreshResponseDto,
  UsernameAvailabilityResponseDto,
  GameModeDto,
  HydratedRatingDto,
  UserProfileDto,
  CurrentUserResponseDto,
  PublicUserProfileSettingsDto,
  PublicUserProfileDto,
  AvatarUploadResponseDto,
  UserIdentityDto,
  MatchHistoryOpponentDto,
  MatchHistoryItemDto,
  MatchHistoryResponseDto,
  MatchPlayerDto,
  MatchWinnerDto,
  MatchMoveDto,
  MatchFinalStateDto,
  MatchDetailsResponseDto,
  LeaderboardCategoryDto,
  LeaderboardEntryDto,
  LeaderboardResponseDto,
  ActiveMatchResponseDto,
  HealthResponseDto,
] as const;
