class IntegrationError(RuntimeError):
    """An external data provider could not complete a scrape."""


class IntegrationNotFoundError(IntegrationError):
    """The requested external profile does not exist."""
