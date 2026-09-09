import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '../../../common/enums';

export class CreatePaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  // In a real integration this would be a Stripe/Adyen PaymentIntent id
  // returned by their hosted card element — the app never sees a card
  // number (spec §10, §14). Simulated here since no live provider is wired
  // up; the shape is what a real integration would fill in.
  @IsOptional()
  @IsString()
  providerRef?: string;

  @IsOptional()
  @IsString()
  cardLast4?: string;
}
