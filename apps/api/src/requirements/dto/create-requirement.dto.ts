export class CreateRequirementDto {
    code: string;
    title: string;
    content: string;
    businessId?: string;
    functionId?: string;
    menuId?: string;
    categoryId?: string;
    creatorId: string;
}
