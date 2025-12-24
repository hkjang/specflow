import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl } from 'class-validator';
import { AiProviderType } from '@prisma/client';

export class CreateAiProviderDto {
    @IsString()
    name: string;

    @IsEnum(AiProviderType)
    type: AiProviderType;

    @IsString()
    endpoint: string;

    @IsOptional()
    @IsString()
    apiKey?: string;

    @IsString()
    models: string;

    @IsOptional()
    @IsInt()
    priority?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateAiProviderDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEnum(AiProviderType)
    type?: AiProviderType;

    @IsOptional()
    @IsString()
    endpoint?: string;

    @IsOptional()
    @IsString()
    apiKey?: string;

    @IsOptional()
    @IsString()
    models?: string;

    @IsOptional()
    @IsInt()
    priority?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
