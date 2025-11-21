## NOTE: If you are looking for a better account generator, look at https://pigservices.sellix.io/

from selenium import webdriver
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from time import sleep
import random
import string
import os
import socket
from urllib.parse import urlparse
from handlers import Element, DOBNavigator


##############
proxy = "PROXY"  # Remember to enter your proxy
speedMultiplier = 5  # Generally higher speed = more difficult captcha
##########

# --- Browser setup section ---
options = Options()

# Try to detect browser automatically (Arch uses /usr/bin/chromium or /usr/bin/google-chrome-stable)
if os.path.exists("/usr/bin/google-chrome-stable"):
    options.binary_location = "/usr/bin/google-chrome-stable"
elif os.path.exists("/usr/bin/chromium"):
    options.binary_location = "/usr/bin/chromium"

options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--disable-gpu")
# Uncomment next line if you want headless mode:
# options.add_argument("--headless=new")

# helper function
def enable_direct_connection():
    options.add_argument("--no-proxy-server")
    options.add_argument("--proxy-bypass-list=*")

# Proxy handling
if not proxy or proxy.upper() == "PROXY":
    print("[+] No proxy configured or placeholder detected, using direct connection.")
    enable_direct_connection()
else:
    parsed = urlparse(proxy if "://" in proxy else f"//{proxy}", scheme="http")
    host = parsed.hostname
    port = parsed.port or 80
    reachable = False
    try:
        print(f"[+] Checking proxy reachability {host}:{port} ...")
        with socket.create_connection((host, port), timeout=5):
            reachable = True
    except Exception as e:
        print(f"[!] Proxy check failed: {e!s}")
        reachable = False

    if reachable:
        proxy_url = f"{parsed.scheme}://{host}:{port}"
        print(f"[+] Using proxy {proxy_url}")
        options.add_argument(f"--proxy-server={proxy_url}")
    else:
        print("[+] Falling back to direct connection.")
        enable_direct_connection()

# Force using local ChromeDriver
service = Service("/usr/bin/chromedriver")

try:
    driver = webdriver.Chrome(service=service, options=options, keep_alive=True)
except WebDriverException as e:
    print(f"[!] Exception managing chrome: {e}")
    print("[!] Trying fallback without proxy ...")
    enable_direct_connection()
    driver = webdriver.Chrome(service=service, options=options, keep_alive=True)

actions = ActionChains(driver)
driver.get("https://discord.com/register")
sleep(2)

class InputSelectors:
    emailinput = "#uid_5"
    displaynameInput = "#uid_6"
    usernameInput = "#uid_7"
    passwordInput = "#uid_8"
    continueButton = "button[type='submit']"
    tosCheckbox = '#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div > div > form > div.centeringWrapper__319b0 > div > div.flex_f5fbb7.horizontal__992f6.justifyStart__42744.alignCenter__84269.noWrap__5c413.marginTop20_d88ee7 > label > div.checkbox_c7f690.box__66058'


### Generate the login details ###
username = ''.join(random.choice(string.digits + string.ascii_letters) for i in range(8))
email = ''.join(random.choice(string.ascii_letters) for i in range(5)) + '@gmail.com'
password = ''.join(random.choice(string.digits + string.ascii_letters) for i in range(8))
##################################


# Find the email input field and type the email
elmnt = Element(driver.find_element(By.NAME, "email"))
elmnt.click().typeSlow(email, speedMultiplier)

# Find the display name input field and type the display name
elmnt = Element(driver.find_element(By.NAME, "global_name"))
elmnt.click().typeSlow(username, speedMultiplier)

# Find the username input field and type the username
elmnt = Element(driver.find_element(By.NAME, "username"))
elmnt.click().typeSlow(username, speedMultiplier)

# Find the password input field and type the password
elmnt = Element(driver.find_element(By.NAME, "password"))
elmnt.click().typeSlow(password, speedMultiplier)

# Slightly more complex functions to increase the believability and accuracy of the date of birth section
dobber = DOBNavigator(driver)

dobber.openMenu("day")
selection = dobber.chooseElement(Element(dobber.getMenuObject().getChildren()[0]).getChildren())
selection.scrollIntoView(actions).click()
sleep(0.5 / speedMultiplier)

dobber.openMenu("month")
selection = dobber.chooseElement(Element(dobber.getMenuObject().getChildren()[0]).getChildren())
selection.scrollIntoView(actions).click()
sleep(0.5 / speedMultiplier)

dobber.openMenu("year")
selection = dobber.chooseElement(Element(dobber.getMenuObject().getChildren()[0]).getChildren())
selection.scrollIntoView(actions).click()
sleep(0.5 / speedMultiplier)

try:
    driver.find_element(By.CSS_SELECTOR, InputSelectors.tosCheckbox).click()  # Accept TOS
    sleep(0.3 / speedMultiplier)
except NoSuchElementException:
    pass

driver.find_element(By.CSS_SELECTOR, InputSelectors.continueButton).click()  # Continue

print('')
print(r'   __ _ _ _   _                         _       _           ')
print(r'  / _(_) | | (_)                       | |     | |          ')
print(r' | |_ _| | |  _ _ __     ___ __ _ _ __ | |_ ___| |__   __ _ ')
print(r' |  _| | | | | | `_ \   / __/ _` | `_ \| __/ __| `_ \ / _` |')
print(r' | | | | | | | | | | | | (_| (_| | |_) | || (__| | | | (_| |')
print(r' |_| |_|_|_| |_|_| |_|  \___\__,_| .__/ \__\___|_| |_|\__,_|')
print(r'                                 | |                        ')
print(r'                                 |_|                        ')

input('Press ENTER to get 0Auth token.')

token = driver.execute_script(
    'location.reload();var i=document.createElement("iframe");'
    'document.body.appendChild(i);return i.contentWindow.localStorage.token'
).strip('"')

print(f'Made account:')
print(f'{email}:{password}:{username}:{token}')

input("Enter to exit... ")
driver.close()
