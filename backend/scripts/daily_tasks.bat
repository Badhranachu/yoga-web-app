@echo off
REM Runs every daily maintenance job the app needs:
REM   - generate_slots: rolls the bookable-slot horizon forward
REM   - activate_due_subscriptions: flips scheduled subscriptions to active on their start date
REM   - send_low_usage_reminders: emails members with low usage and 10 days left on their cycle
REM Registered as a Windows Scheduled Task (see setup notes in docs/) to run once daily.

cd /d "%~dp0.."
call .venv\Scripts\activate.bat

python manage.py generate_slots
python manage.py activate_due_subscriptions
python manage.py send_low_usage_reminders
