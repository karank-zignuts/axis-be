import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class CreateChecklistDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  items!: string[];
}
