package com.ambercity.manager.module.room;

import com.ambercity.manager.module.room.dto.CreateRoomRequest;
import com.ambercity.manager.module.room.dto.PatchRoomRequest;
import com.ambercity.manager.module.room.dto.RoomResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/rooms")
@PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','CONCIERGE')")
public class RoomController {

  private final RoomService roomService;

  public RoomController(RoomService roomService) {
    this.roomService = roomService;
  }

  @GetMapping
  public List<RoomResponse> list(@RequestParam(required = false) Boolean actif) {
    return roomService.findAll(actif);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public RoomResponse create(@Valid @RequestBody CreateRoomRequest request) {
    return roomService.create(request);
  }

  @PatchMapping("/{id}")
  public RoomResponse patch(@PathVariable Long id, @Valid @RequestBody PatchRoomRequest request) {
    return roomService.patch(id, request);
  }
}
