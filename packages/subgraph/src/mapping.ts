import { BigInt } from "@graphprotocol/graph-ts"
import {
  Roles,
  AllowTarget,
  AllowTargetPartially,
  AssignRoles,
  AvatarSet,
  ChangedGuard,
  DisabledModule,
  EnabledModule,
  OwnershipTransferred,
  RevokeTarget,
  RolesModSetup,
  ScopeAllowFunction,
  ScopeFunction,
  ScopeParameter,
  ScopeParameterAsOneOf,
  ScopeRevokeFunction,
  SetDefaultRole,
  SetMulitSendAddress,
  TargetSet,
  UnscopeParameter
} from "../generated/Roles/Roles"
import { Role, Module, Target } from "../generated/schema"

export function handleAllowTarget(event: AllowTarget): void {
  const roleId = event.params.role.toString()
  let role = Role.load(roleId)

  // creates a new role if this is the first time we encounter this role
  if (!role) {
    role = new Role(roleId)
    role.save()
  }

  const targetId = event.params.role.toString() + "-" + event.params.targetAddress.toHex()
  let target = Target.load(targetId)

  // if target does not exist we create it
  // if the target exists it should be in the roles target array. No target should exist independent of a role.
  if (!target) {
    target = new Target(targetId)
    target.address = event.params.targetAddress
    target.role = roleId
    target.save()
  }

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.avatar(...)
  // - contract.defaultRoles(...)
  // - contract.execTransactionFromModule(...)
  // - contract.execTransactionFromModuleReturnData(...)
  // - contract.execTransactionWithRole(...)
  // - contract.execTransactionWithRoleReturnData(...)
  // - contract.getGuard(...)
  // - contract.getModulesPaginated(...)
  // - contract.guard(...)
  // - contract.isModuleEnabled(...)
  // - contract.multiSend(...)
  // - contract.owner(...)
  // - contract.target(...)
}

export function handleAllowTargetPartially(event: AllowTargetPartially): void { }

export function handleAssignRoles(event: AssignRoles): void {


}

export function handleAvatarSet(event: AvatarSet): void { }

export function handleChangedGuard(event: ChangedGuard): void { }

export function handleDisabledModule(event: DisabledModule): void { }

export function handleEnabledModule(event: EnabledModule): void { }

export function handleOwnershipTransferred(event: OwnershipTransferred): void { }

export function handleRevokeTarget(event: RevokeTarget): void {
}

export function handleRolesModSetup(event: RolesModSetup): void { }

export function handleScopeAllowFunction(event: ScopeAllowFunction): void { }

export function handleScopeFunction(event: ScopeFunction): void { }

export function handleScopeParameter(event: ScopeParameter): void { }

export function handleScopeParameterAsOneOf(
  event: ScopeParameterAsOneOf
): void { }

export function handleScopeRevokeFunction(event: ScopeRevokeFunction): void { }

export function handleSetDefaultRole(event: SetDefaultRole): void { }

export function handleSetMulitSendAddress(event: SetMulitSendAddress): void { }

export function handleTargetSet(event: TargetSet): void { }

export function handleUnscopeParameter(event: UnscopeParameter): void { }