import { IsString, IsOptional, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateRequirementDto {
    @IsOptional()
    @IsString()
    @MaxLength(50)
    code?: string;

    @IsString()
    @IsNotEmpty({ message: '제목은 필수입니다.' })
    @MinLength(2, { message: '제목은 최소 2자 이상이어야 합니다.' })
    @MaxLength(200, { message: '제목은 최대 200자까지 가능합니다.' })
    title: string;

    @IsString()
    @IsNotEmpty({ message: '내용은 필수입니다.' })
    @MinLength(10, { message: '내용은 최소 10자 이상이어야 합니다.' })
    content: string;

    @IsOptional()
    @IsString()
    businessId?: string;

    @IsOptional()
    @IsString()
    functionId?: string;

    @IsOptional()
    @IsString()
    menuId?: string;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsString()
    creatorId?: string;
}
