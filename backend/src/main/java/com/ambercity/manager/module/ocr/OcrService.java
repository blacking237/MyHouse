package com.ambercity.manager.module.ocr;

import com.ambercity.manager.module.ocr.dto.OcrIdentityRequest;
import com.ambercity.manager.module.ocr.dto.OcrIdentityResponse;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class OcrService {

  public OcrIdentityResponse parseIdentity(OcrIdentityRequest request) {
    Map<String, String> fields = new HashMap<>();
    fields.put("documentType", request.documentType());
    fields.put("fullName", "PENDING_REVIEW");
    fields.put("idNumber", "PENDING_REVIEW");
    fields.put("dateOfBirth", "PENDING_REVIEW");
    fields.put("nationality", "PENDING_REVIEW");
    return new OcrIdentityResponse("PENDING_REVIEW", true, fields);
  }
}
