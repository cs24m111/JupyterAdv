import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def retriable_requests(
    retries=3, backoff_factor=0.1, status_forcelist=(500, 502, 503, 504)
):
    session = requests.Session()
    retry_policy = Retry(
        total=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
    )
    session.mount("http://", HTTPAdapter(max_retries=retry_policy))
    session.mount("https://", HTTPAdapter(max_retries=retry_policy))
    return session
