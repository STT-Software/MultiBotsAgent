import { Controller, Get } from "@nestjs/common";
import { SkipEmailVerification } from "../email-verification/decorators/skip-email-verification.decorator";

@SkipEmailVerification()
@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { status: "ok", service: "api-multi-bots" };
  }
}
