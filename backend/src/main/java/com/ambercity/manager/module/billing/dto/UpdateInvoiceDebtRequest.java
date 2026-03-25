package com.ambercity.manager.module.billing.dto;

import java.math.BigDecimal;

public record UpdateInvoiceDebtRequest(
  BigDecimal dette
) {}
