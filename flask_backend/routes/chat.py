import io
import json
import time
from threading import Lock
from typing import Dict, List
from urllib import request as urllib_request, error as urllib_error

from flask import Blueprint, current_app, jsonify, request

chat_bp = Blueprint('chat', __name__)

_last_request_time: float = 0.0
_request_lock = Lock()


@chat_bp.post('/message')
def chat_message():
    """Handle chatbot messages using OpenRouter API"""
    data = request.get_json()
    
    if not data or 'message' not in data:
        return jsonify({'success': False, 'message': 'No message provided'}), 400
    
    user_message = data.get('message', '')
    conversation_history = data.get('history', [])
    
    # Get primary and backup API keys
    api_key = current_app.config.get('CHAT_API_KEY')
    api_key_backup = current_app.config.get('CHAT_API_KEY_BACKUP', '')
    model = current_app.config.get('CHAT_MODEL', 'deepseek/deepseek-chat')
    api_url = current_app.config.get('LLM_API_URL', 'https://openrouter.ai/api/v1/chat/completions')
    
    if not api_key:
        return jsonify({
            'success': False,
            'message': 'Chat API key not configured'
        }), 500
    
    current_app.logger.info(f'Chat request received: message length={len(user_message)}, model={model}')
    
    try:
        # Build messages array for OpenRouter API
        messages: List[Dict[str, str]] = []

        system_prompt = current_app.config.get('CHAT_SYSTEM_PROMPT')
        if system_prompt:
            messages.append({'role': 'system', 'content': system_prompt})

        # Add conversation history if provided
        if conversation_history:
            for msg in conversation_history:
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                if role in ['user', 'assistant', 'system'] and content:
                    messages.append({'role': role, 'content': content})

        # Add current user message
        messages.append({'role': 'user', 'content': user_message})
        
        # Prepare request payload
        payload = json.dumps({
            'model': model,
            'messages': messages,
            'temperature': 0.7,
            'max_tokens': 1000
        }).encode('utf-8')

        # Enforce minimum interval between upstream requests
        min_interval = float(current_app.config.get('CHAT_MIN_INTERVAL', 5.0))
        global _last_request_time
        with _request_lock:
            now = time.time()
            wait_seconds = (_last_request_time + min_interval) - now
            if wait_seconds > 0:
                # Return 429 immediately instead of waiting
                return jsonify({
                    'success': False,
                    'message': f'Rate limit: Please wait {int(wait_seconds)} second{"s" if wait_seconds > 1 else ""} before sending another message.'
                }), 429
            # Update timestamp immediately to avoid burst from concurrent requests
            _last_request_time = time.time()

        # Try primary API key first, then backup if primary fails
        api_keys_to_try = [api_key]
        if api_key_backup:
            api_keys_to_try.append(api_key_backup)
        
        result = None
        last_error: Dict[str, str] = {}
        used_backup = False
        
        for key_index, current_api_key in enumerate(api_keys_to_try):
            if key_index > 0:
                used_backup = True
                # Small delay before trying backup key
                time.sleep(0.5)
            
            req = urllib_request.Request(
                api_url,
                data=payload,
                headers={
                    'Authorization': f'Bearer {current_api_key}',
                    'Content-Type': 'application/json',
                    'HTTP-Referer': current_app.config.get('FRONTEND_URL', 'http://localhost:5173'),
                    'X-Title': 'NutriLens Chat'
                },
                method='POST'
            )

            max_attempts = 3
            attempt = 0
            key_succeeded = False

            while attempt < max_attempts:
                try:
                    with urllib_request.urlopen(req, timeout=30) as response:
                        response_body = response.read().decode('utf-8')
                        result = json.loads(response_body)
                    key_succeeded = True
                    break
                except urllib_error.HTTPError as e:
                    status_code = e.code
                    error_body = e.read().decode('utf-8')
                    error_json = {}
                    try:
                        error_json = json.loads(error_body) if error_body else {}
                    except Exception:
                        error_json = {}

                    last_error = {
                        'message': (
                            error_json.get('error', {}).get('message')
                            or error_json.get('message')
                            or error_body
                            or str(e)
                        ),
                        'status': str(status_code)
                    }

                    # If 401 (unauthorized), try backup key immediately
                    if status_code == 401 and key_index == 0 and api_key_backup:
                        break  # Exit inner loop to try backup key
                    
                    if status_code == 429:
                        # If rate limited and we have a backup key, try it before waiting
                        if key_index == 0 and api_key_backup and attempt == 0:
                            break  # Try backup key first before retrying with same key
                        
                        retry_after_header = e.headers.get('Retry-After')
                        try:
                            retry_after = float(retry_after_header) if retry_after_header else None
                        except ValueError:
                            retry_after = None
                        wait_seconds = retry_after if retry_after and retry_after > 0 else max(min_interval, 2 ** attempt)
                        with _request_lock:
                            _last_request_time = time.time() + wait_seconds
                        if attempt < max_attempts - 1:
                            time.sleep(wait_seconds)
                            attempt += 1
                            continue

                    # For other errors, if we have a backup key and this is the primary, try backup
                    if status_code >= 500 and key_index == 0 and api_key_backup:
                        break  # Exit inner loop to try backup key
                    
                    e.msg = last_error['message']
                    e.fp = io.BytesIO(error_body.encode('utf-8'))
                    raise
                except urllib_error.URLError as e:
                    last_error = {'message': str(e.reason), 'status': '0'}
                    # For network errors, if we have a backup key and this is the primary, try backup
                    if key_index == 0 and api_key_backup:
                        break  # Exit inner loop to try backup key
                    if attempt < max_attempts - 1:
                        time.sleep(1 + attempt)
                        attempt += 1
                        continue
                    raise
            
            if key_succeeded:
                break  # Successfully got response, exit key loop
        
        if result is None:
            raise urllib_error.URLError(last_error.get('message', 'OpenRouter request failed with all API keys'))
        
        # Extract the assistant's message from the response
        choices = result.get('choices', [])
        if choices:
            assistant_message = choices[0].get('message', {}).get('content')

            if assistant_message:
                return jsonify({
                    'success': True,
                    'data': {
                        'message': assistant_message,
                        'model': model
                    }
                }), 200

        return jsonify({
            'success': False,
            'message': 'OpenRouter API returned no content.'
        }), 502
        
    except urllib_error.HTTPError as e:
        status_code = e.code
        error_body = ''
        message = str(e)
        try:
            error_body = e.read().decode('utf-8')
            error_json = json.loads(error_body) if error_body else {}
            message = (
                error_json.get('error', {}).get('message')
                or error_json.get('message')
                or error_body
                or message
            )
        except Exception:
            pass

        if status_code == 401:
            return jsonify({
                'success': False,
                'message': 'Chat service rejected the provided API key. Please update CHAT_API_KEY and restart the backend.'
            }), 502
        
        if status_code == 404:
            # Check if it's a data policy error
            if 'data policy' in message.lower() or 'privacy' in message.lower():
                return jsonify({
                    'success': False,
                    'message': 'Model requires OpenRouter privacy settings to be configured. Please visit https://openrouter.ai/settings/privacy and enable "Free model publication" or use a different model.'
                }), 502
            return jsonify({
                'success': False,
                'message': f'Model not found or unavailable: {message}'
            }), 502

        if status_code == 429:
            retry_after_header = getattr(e, 'headers', {}).get('Retry-After') if hasattr(e, 'headers') else None
            try:
                retry_after = float(retry_after_header) if retry_after_header else None
            except (TypeError, ValueError):
                retry_after = None
            wait_seconds = int(retry_after) if retry_after and retry_after > 0 else int(max(min_interval, 60))
            with _request_lock:
                _last_request_time = time.time() + wait_seconds
            return jsonify({
                'success': False,
                'message': f'OpenRouter rate limit reached. Please wait about {wait_seconds} seconds before trying again.'
            }), 429

        return jsonify({
            'success': False,
            'message': f'OpenRouter API request failed: {message}'
        }), status_code
    except urllib_error.URLError as e:
        return jsonify({
            'success': False,
            'message': f'OpenRouter API request failed: {e.reason}'
        }), 502
    except Exception as e:
        current_app.logger.error(f'Chat request exception: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Chat request failed: {str(e)}'
        }), 500

