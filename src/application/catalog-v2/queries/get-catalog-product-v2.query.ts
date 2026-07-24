export class GetCatalogProductV2Query {
  constructor(
    public readonly id: string,
    public readonly admin = false,
  ) {}
}
