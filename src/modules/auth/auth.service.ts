import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User, RefreshToken } from '../../core/entities';
import { LoginDto, RefreshTokenDto, AuthResponseDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { email, isActive: true, deletedAt: null },
      });

      if (user && (await bcrypt.compare(password, user.password))) {
        return user;
      }
      return null;
    } catch (error) {
      this.logger.error(`Error validating user: ${error.message}`);
      return null;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    try {
      // Validate refresh token format
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'refresh-secret',
      });

      // Check if refresh token exists and is not revoked
      const tokenHash = await bcrypt.hash(refreshTokenDto.refreshToken, 10);
      const storedToken = await this.refreshTokenRepository.findOne({
        where: {
          userId: payload.sub,
          revoked: false,
        },
        relations: ['user'],
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Revoke old refresh token (token rotation)
      await this.revokeRefreshToken(storedToken.id);

      // Generate new tokens
      return this.generateTokens(storedToken.user);
    } catch (error) {
      this.logger.error(`Error refreshing token: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revoked: false },
      { revoked: true, revokedAt: new Date() },
    );
  }

  private async generateTokens(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessTokenExpiry = this.configService.get<string>('JWT_EXPIRY') || '15m';
    const refreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d';

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'default-secret',
      expiresIn: accessTokenExpiry,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'refresh-secret',
      expiresIn: refreshTokenExpiry,
    });

    // Store refresh token in database
    await this.storeRefreshToken(user.id, user.tenantId, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiryToSeconds(accessTokenExpiry),
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  private async storeRefreshToken(
    userId: string,
    tenantId: string,
    token: string,
  ): Promise<void> {
    // Revoke all previous refresh tokens for this user
    await this.refreshTokenRepository.update(
      { userId, revoked: false },
      { revoked: true, revokedAt: new Date() },
    );

    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const refreshTokenEntity = this.refreshTokenRepository.create({
      tokenHash,
      userId,
      tenantId,
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);
  }

  private async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { id: tokenId },
      { revoked: true, revokedAt: new Date() },
    );
  }

  private parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900; // Default 15 minutes
    }
  }
}