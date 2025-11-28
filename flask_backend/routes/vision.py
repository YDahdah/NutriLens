import base64
import json
import re
import time
from typing import Any, Dict, List
from urllib import error as urllib_error, request as urllib_request

from flask import Blueprint, current_app, jsonify, request


vision_bp = Blueprint('vision', __name__)


def _extract_output_text(content: Any) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: List[str] = []
        for block in content:
            if not isinstance(block, dict):
                continue
            block_type = block.get('type')
            if block_type in {'text', 'output_text', 'message'}:
                text_piece = block.get('text') or block.get('content') or ''
                parts.append(str(text_piece))
        return ''.join(parts).strip()
    return ''


def _format_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    items = payload.get('items')
    if not isinstance(items, list):
        items = []

    recipe = payload.get('recipe')
    if recipe is not None and not isinstance(recipe, dict):
        recipe = None

    summary = payload.get('summary')
    if not isinstance(summary, str):
        summary = ''

    dish_name = payload.get('dish_name')
    if dish_name is not None and not isinstance(dish_name, str):
        dish_name = None

    return {
        'dish_name': dish_name,
        'items': items,
        'recipe': recipe,
        'summary': summary,
    }


@vision_bp.post('/analyze')
def analyze_photo():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'Empty filename'}), 400

    # Use primary API key, fallback to backup if needed
    api_key = current_app.config.get('CHAT_API_KEY')
    api_key_backup = current_app.config.get('CHAT_API_KEY_BACKUP', '')
    
    if not api_key:
        return jsonify({
            'success': False,
            'message': 'OpenRouter API key not configured. Please set CHAT_API_KEY in your environment variables or config file.'
        }), 500
    
    # Use vision-specific model (must support image inputs)
    # Default to GPT-5.1 as requested, with fallback to GPT-4o and Gemini
    primary_model = current_app.config.get('VISION_MODEL') or current_app.config.get('CHAT_MODEL', 'openai/gpt-5.1')
    fallback_model = 'openai/gpt-4o'  # First fallback if GPT-5.1 is not available
    gemini_fallback = 'google/gemini-2.0-flash-exp:free'  # Second fallback (free and reliable)
    model = primary_model
    vision_api_url = 'https://openrouter.ai/api/v1/chat/completions'
    
    # Log the model being used for debugging
    current_app.logger.info(f'Primary vision model: {primary_model}, Fallbacks: {fallback_model}, {gemini_fallback}')
    current_app.logger.info(f'API key present: {bool(api_key)} (length: {len(api_key) if api_key else 0})')
    current_app.logger.info(f'Backup API key present: {bool(api_key_backup)}')
    
    # Ensure we're using a vision-capable model
    # Check for models that don't support vision and fallback
    # Note: GPT-5.1 should support vision, so we don't auto-fallback it
    model_lower = model.lower()
    if ('deepseek' in model_lower and 'vision' not in model_lower) or \
       ('gpt-3.5' in model_lower and 'vision' not in model_lower) or \
       ('gpt-4' in model_lower and 'vision' not in model_lower and 'gpt-4o' not in model_lower and 'gpt-4-turbo' not in model_lower and 'gpt-5' not in model_lower):
        # These models don't support vision, but user wants GPT-5.1, so don't auto-fallback
        # Only fallback if explicitly not GPT-5 or GPT-5.1
        if 'gpt-5' not in model_lower:
            current_app.logger.warning(f'Model {model} does not support vision, but keeping as-is since user may want to test it')
    system_prompt = current_app.config.get('VISION_SYSTEM_PROMPT') or (
        "You are NutriVision, a food analysis expert. Respond ONLY with valid JSON as specified."
    )
    temperature = float(current_app.config.get('VISION_TEMPERATURE', 0.2))
    max_tokens = int(current_app.config.get('VISION_MAX_TOKENS', 1000))
    frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')

    if not api_key:
        return jsonify({
            'success': True,
            'data': {
                'items': [
                    {'name': 'lettuce', 'confidence': 0.9, 'calories': 10},
                    {'name': 'tomatoes', 'confidence': 0.9, 'calories': 25},
                    {'name': 'cucumbers', 'confidence': 0.8, 'calories': 15},
                    {'name': 'olive oil dressing', 'confidence': 0.7, 'calories': 80},
                ],
                'recipe': {
                    'title': 'Simple Mixed Salad',
                    'ingredients': ['lettuce', 'tomato', 'cucumber', 'olive oil', 'lemon'],
                    'instructions': ['Chop veggies', 'Dress with oil and lemon', 'Season and serve'],
                    'estimatedCalories': 130,
                },
                'summary': 'Vision service API key not set. Returning a placeholder estimate with individual food items.'
            }
        }), 200

    try:
        image_bytes = file.read()
        image_size = len(image_bytes)
        current_app.logger.info(f'Image size: {image_size} bytes, MIME type: {file.mimetype}')
        
        # Check image size (OpenRouter has limits)
        if image_size > 20 * 1024 * 1024:  # 20MB limit
            return jsonify({
                'success': False,
                'message': f'Image too large ({image_size / 1024 / 1024:.1f}MB). Maximum size is 20MB. Please compress or resize your image.'
            }), 400
        
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')
        data_url = f"data:{file.mimetype};base64,{image_b64}"
        current_app.logger.info(f'Base64 encoded image length: {len(image_b64)} characters')

        # Build payload - adjust parameters for GPT-5 compatibility
        payload = {
            'model': model,
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {
                    'role': 'user',
                    'content': [
                        {
                            'type': 'text',
                            'text': (
                                "Analyze the following meal photo. You MUST identify EACH DISTINCT FOOD ITEM visible in the image separately. "
                                "DO NOT combine multiple food items into one entry. Each visible food component must be listed separately. "
                                "\n\n"
                                "REQUIREMENTS:\n"
                                "1. Look at the image carefully and identify EVERY distinct food item you can see\n"
                                "2. Create a separate entry in the 'items' array for EACH food item\n"
                                "3. Each item must have: name (specific food name), confidence (0-1), and calories (estimated for the portion shown)\n"
                                "4. Examples:\n"
                                "   - If you see a salad with lettuce, tomatoes, cucumbers, and chicken: create 4 separate items\n"
                                "   - If you see rice, chicken, and broccoli: create 3 separate items\n"
                                "   - If you see a pizza with pepperoni, cheese, and crust: create separate items for each component\n"
                                "\n"
                                "Use the JSON schema: {is_food_image: boolean, reason: string, items: [{name: string, confidence: number, calories: number}], recipe: {...}, summary: string}\n"
                                "Set is_food_image to false if the image is not primarily food-related."
                            ),
                        },
                        {
                            'type': 'image_url',
                            'image_url': {
                                'url': data_url,
                            },
                        },
                    ],
                },
            ],
            'temperature': temperature,
            'max_tokens': max_tokens,
        }
        
        # For GPT-5/5.1, ensure we don't use unsupported parameters
        # Some GPT-5 variants may not support top_p parameter
        if 'gpt-5' in model.lower():
            # Remove top_p if it exists, GPT-5/5.1 may not support it
            if 'top_p' in payload:
                del payload['top_p']

        request_data = json.dumps(payload).encode('utf-8')
        
        # Try primary API key first, then backup if needed
        api_keys_to_try = [api_key]
        if api_key_backup:
            api_keys_to_try.append(api_key_backup)
        
        result = None
        last_error = None
        last_error_body = ''
        last_error_code = None
        
        for key_index, current_api_key in enumerate(api_keys_to_try):
            if key_index > 0:
                time.sleep(0.5)  # Small delay before trying backup
            
            req = urllib_request.Request(
                vision_api_url,
                data=request_data,
                headers={
                    'Authorization': f'Bearer {current_api_key}',
                    'Content-Type': 'application/json',
                    'HTTP-Referer': frontend_url,
                    'X-Title': 'NutriLens Meal Analyzer',
                },
                method='POST',
            )
            
            try:
                # Increased timeout for vision requests - GPT-4o can take up to 3 minutes for complex images
                with urllib_request.urlopen(req, timeout=180) as response:
                    response_body = response.read().decode('utf-8')
                    result = json.loads(response_body)
                    current_app.logger.info(f'Successfully got response from OpenRouter using model {model}')
                    break  # Success, exit loop
            except urllib_error.HTTPError as e:
                last_error = e
                last_error_code = e.code
                error_body = ''
                try:
                    error_body = e.read().decode('utf-8') if e.fp else ''
                    last_error_body = error_body
                    # Log the full error for debugging
                    current_app.logger.error(f'OpenRouter HTTP {e.code} error for model {model}: {error_body[:500]}')
                except Exception:
                    pass
                
                # If 401 and we have backup, try it
                if e.code == 401 and key_index == 0 and api_key_backup:
                    continue  # Try backup key
                
                # If 429 (rate limit) and we have backup, try it
                if e.code == 429 and key_index == 0 and api_key_backup:
                    # Try backup key for rate limit
                    current_app.logger.warning(f'Rate limit on primary key, trying backup key')
                    continue
                
                # If 429 on the last key (backup), don't return immediately - let fallback logic try different models
                # Different models (especially free ones like Gemini) may have separate rate limits
                if e.code == 429 and key_index == len(api_keys_to_try) - 1:
                    current_app.logger.warning(f'Rate limit on all API keys for model {model}, will try fallback models')
                    # Store error info but don't return yet - let fallback logic try other models
                    if error_body:
                        try:
                            error_json = json.loads(error_body)
                            error_detail = error_json.get('error', {})
                            if isinstance(error_detail, dict):
                                api_message = error_detail.get('message', '')
                                if api_message:
                                    last_error_body = error_body
                                    # Continue to fallback logic - don't return yet
                                    break
                        except Exception:
                            pass
                    # Continue to fallback logic
                    break
                
                # For 400 errors with GPT-5.1, don't raise immediately - let fallback logic handle it
                if e.code == 400 and 'gpt-5' in model.lower() and model == primary_model:
                    # Store error for fallback logic, but don't raise yet
                    if error_body:
                        e.error_body = error_body
                    # Break out of key loop to try fallback model
                    break
                
                # For other errors, raise immediately with preserved error body
                if error_body:
                    # Store error body in a way that can be accessed later
                    e.error_body = error_body
                raise
            except urllib_error.URLError as e:
                last_error = e
                # For network errors, try backup if available
                if key_index == 0 and api_key_backup:
                    continue  # Try backup key
                raise
        
        # If result is None and we got an error, try fallback models
        # Always try fallbacks if primary model failed (for GPT-5.1 or any model that fails)
        # Also try fallbacks for 429 errors - different models may have different rate limits
        current_app.logger.info(f'After first attempt - result: {result is None}, error_code: {last_error_code}, model: {model}, primary: {primary_model}')
        
        # Try fallback if primary model failed (no result) OR if we got a 429 error
        # 429 errors might be model-specific, so trying a different model (like Gemini free tier) might work
        should_try_fallback = (result is None) or (last_error_code == 429)
        current_app.logger.info(f'Should try fallback: {should_try_fallback} (result=None: {result is None}, error_code: {last_error_code})')
        
        if should_try_fallback:
            # Try fallback models in sequence: GPT-4o -> Gemini
            fallback_models = [fallback_model, 'google/gemini-2.0-flash-exp:free']
            
            for fallback_idx, current_fallback in enumerate(fallback_models):
                if last_error_code == 429:
                    current_app.logger.info(f'Rate limit on {primary_model}, trying fallback model {fallback_idx + 1}/{len(fallback_models)}: {current_fallback}')
                else:
                    current_app.logger.info(f'{primary_model} not available, trying fallback model {fallback_idx + 1}/{len(fallback_models)}: {current_fallback}')
                model = current_fallback
                # Rebuild payload with fallback model
                payload['model'] = current_fallback
                request_data = json.dumps(payload).encode('utf-8')
                
                # Reset error tracking
                result = None
                last_error = None
                last_error_code = None
                last_error_body = ''
                
                # Try again with fallback model
                for key_index, current_api_key in enumerate(api_keys_to_try):
                    if key_index > 0:
                        time.sleep(0.5)
                    
                    req = urllib_request.Request(
                        vision_api_url,
                        data=request_data,
                        headers={
                            'Authorization': f'Bearer {current_api_key}',
                            'Content-Type': 'application/json',
                            'HTTP-Referer': frontend_url,
                            'X-Title': 'NutriLens Meal Analyzer',
                        },
                        method='POST',
                    )
                    
                    try:
                        with urllib_request.urlopen(req, timeout=180) as response:
                            response_body = response.read().decode('utf-8')
                            result = json.loads(response_body)
                            current_app.logger.info(f'Successfully got response using fallback model {current_fallback}')
                            break  # Success, exit both loops
                    except urllib_error.HTTPError as e:
                        last_error = e
                        last_error_code = e.code
                        error_body = ''
                        try:
                            error_body = e.read().decode('utf-8') if e.fp else ''
                            last_error_body = error_body
                            current_app.logger.error(f'Fallback model {current_fallback} failed with HTTP {e.code}: {error_body[:500]}')
                        except Exception:
                            pass
                        if key_index == len(api_keys_to_try) - 1:
                            break  # Tried all keys for this model
                    except urllib_error.URLError as e:
                        last_error = e
                        current_app.logger.error(f'Fallback model {current_fallback} network error: {e.reason}')
                        if key_index == len(api_keys_to_try) - 1:
                            break  # Tried all keys for this model
                
                # If we got a result, break out of fallback loop
                if result is not None:
                    break
                
                # If this was the last fallback model, we're done trying
                if fallback_idx == len(fallback_models) - 1:
                    current_app.logger.error(f'All fallback models failed. Last error: {last_error_code} - {last_error_body[:200]}')
        
        if result is None:
            # If we have an HTTP error with code and body, create a proper error response
            if last_error_code and last_error_body:
                # Parse and return proper error message
                try:
                    error_json = json.loads(last_error_body)
                    error_detail = error_json.get('error', {})
                    if isinstance(error_detail, dict):
                        api_message = error_detail.get('message', '')
                        if api_message:
                            if last_error_code == 429:
                                # Check if it's a daily limit or general rate limit
                                if 'free-models-per-day' in api_message.lower() or 'daily' in api_message.lower():
                                    return jsonify({
                                        'success': False, 
                                        'message': (
                                            'Daily free model limit reached on all API keys and models.\n\n'
                                            'All vision models (GPT-5.1, GPT-4o, and Gemini) have hit their rate limits.\n\n'
                                            'Solutions:\n'
                                            '1. Wait until tomorrow when limits reset\n'
                                            '2. Add credits to your OpenRouter account at https://openrouter.ai/credits\n'
                                            '3. Use a different API key with available credits\n'
                                            '4. Try again in a few hours (some limits reset periodically)'
                                        )
                                    }), 429
                                else:
                                    return jsonify({
                                        'success': False, 
                                        'message': (
                                            f'Rate limit reached on all models. Last error: {api_message}\n\n'
                                            'The system tried GPT-5.1, GPT-4o, and Gemini, but all hit rate limits.\n\n'
                                            'Please wait a few minutes and try again, or add credits to your OpenRouter account.'
                                        )
                                    }), 429
                            elif last_error_code == 400:
                                # Handle 400 errors - log the actual error for debugging
                                current_app.logger.error(f'OpenRouter 400 error for model {model}: {api_message}')
                                current_app.logger.error(f'Full error body: {last_error_body[:500]}')
                                
                                # Handle "Provider returned error" for 400 status
                                if 'provider returned error' in api_message.lower():
                                    # Check if it's GPT-5/5.1 specifically and we haven't tried fallback yet
                                    if 'gpt-5' in model.lower() and model == primary_model:
                                        # This should have been caught by fallback logic, but if we're here, fallback didn't work
                                        current_app.logger.warning(f'GPT-5.1 failed but fallback was not triggered. Model: {model}, Primary: {primary_model}')
                                        return jsonify({
                                            'success': False, 
                                            'message': (
                                                f'{model} compatibility issue detected. This may be due to:\n'
                                                f'1. {model} not being available on OpenRouter yet\n'
                                                f'2. {model} not supporting vision/image inputs\n'
                                                '3. API parameter incompatibility\n\n'
                                                'The system attempted to use a fallback model but encountered an error. Please try:\n'
                                                '- openai/gpt-4o (best vision support)\n'
                                                '- openai/gpt-4-turbo\n'
                                                '- google/gemini-2.0-flash-exp:free\n\n'
                                                'To fix: Update VISION_MODEL in your config file or set VISION_MODEL environment variable.'
                                            )
                                        }), 400
                                    else:
                                        # All models failed - return comprehensive error
                                        models_tried = f"{primary_model}, {fallback_model}, {gemini_fallback}"
                                        return jsonify({
                                            'success': False, 
                                            'message': (
                                                f'All vision models failed ({models_tried}). Last error: {api_message}\n\n'
                                                'Possible causes:\n'
                                                '1. API key does not have access to vision models\n'
                                                '2. OpenRouter service is experiencing issues\n'
                                                '3. Image format or size is incompatible\n'
                                                '4. Rate limit or quota exceeded\n\n'
                                                'Please check your OpenRouter account, verify your API key has credits, '
                                                'and ensure the image is a valid food photo under 20MB.'
                                            )
                                        }), 400
                                else:
                                    # Show the actual error message from OpenRouter
                                    return jsonify({
                                        'success': False, 
                                        'message': f'OpenRouter API error: {api_message}'
                                    }), 400
                            return jsonify({
                                'success': False, 
                                'message': api_message
                            }), last_error_code
                except Exception:
                    pass
                return jsonify({
                    'success': False, 
                    'message': f'Vision service HTTP error: {last_error_code}'
                }), last_error_code
            raise urllib_error.URLError(last_error.reason if last_error else 'Vision API request failed')

        choices = result.get('choices', [])
        if not choices:
            return jsonify({'success': False, 'message': 'Vision model returned no choices.'}), 502

        first_choice = choices[0]
        if not isinstance(first_choice, dict):
            return jsonify({'success': False, 'message': 'Vision model returned invalid choice format.'}), 502

        message = first_choice.get('message', {})
        if not isinstance(message, dict):
            return jsonify({'success': False, 'message': 'Vision model returned invalid message format.'}), 502

        content = message.get('content')
        output_text = _extract_output_text(content)

        if not output_text:
            return jsonify({'success': False, 'message': 'Vision model returned empty content.'}), 502

        try:
            # Try to extract JSON from markdown code blocks if present
            json_text = output_text
            if '```json' in output_text:
                start = output_text.find('```json') + 7
                end = output_text.find('```', start)
                if end > start:
                    json_text = output_text[start:end].strip()
            elif '```' in output_text:
                start = output_text.find('```') + 3
                end = output_text.find('```', start)
                if end > start:
                    json_text = output_text[start:end].strip()
            
            # Try to find JSON object in the text
            if '{' in json_text and '}' in json_text:
                start_idx = json_text.find('{')
                end_idx = json_text.rfind('}') + 1
                if end_idx > start_idx:
                    json_text = json_text[start_idx:end_idx]
            
            # Try to fix common JSON errors
            # Remove trailing commas before closing braces/brackets
            json_text = re.sub(r',(\s*[}\]])', r'\1', json_text)
            
            # Try parsing
            parsed = json.loads(json_text)
        except json.JSONDecodeError as e:
            # Log the actual response for debugging (more context)
            error_pos = getattr(e, 'pos', None)
            if error_pos:
                start_debug = max(0, error_pos - 100)
                end_debug = min(len(json_text), error_pos + 100)
                debug_snippet = json_text[start_debug:end_debug]
                current_app.logger.error(f'Vision model JSON parse error at position {error_pos}. Snippet: {debug_snippet}')
            else:
                current_app.logger.error(f'Vision model JSON parse error. Response: {output_text[:1000]}')
            
            # Try to extract a valid JSON subset if possible
            try:
                # Find the first complete JSON object
                brace_count = 0
                start_pos = json_text.find('{')
                if start_pos >= 0:
                    for i in range(start_pos, len(json_text)):
                        if json_text[i] == '{':
                            brace_count += 1
                        elif json_text[i] == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                # Found complete object
                                subset_json = json_text[start_pos:i+1]
                                parsed = json.loads(subset_json)
                                current_app.logger.info('Successfully parsed JSON subset after error')
                                break
                    else:
                        raise json.JSONDecodeError("Could not find complete JSON object", json_text, len(json_text))
                else:
                    raise json.JSONDecodeError("No JSON object found", json_text, 0)
            except (json.JSONDecodeError, Exception) as fallback_error:
                return jsonify({
                    'success': False, 
                    'message': f'Vision model returned invalid JSON. Please try again or use a different model. Error: {str(e)}'
                }), 502

        is_food_image = parsed.get('is_food_image')
        if not isinstance(is_food_image, bool):
            return jsonify({'success': False, 'message': 'Vision model response missing is_food_image flag.'}), 502

        if not is_food_image:
            reason = parsed.get('reason')
            if not isinstance(reason, str) or not reason.strip():
                reason = 'The uploaded image does not appear to contain food.'
            return jsonify({'success': False, 'message': reason}), 400

        response_payload = _format_response(parsed)
        return jsonify({'success': True, 'data': response_payload}), 200

    except urllib_error.HTTPError as e:
        error_body = ''
        try:
            # Try to get error body from exception attribute first (if preserved)
            if hasattr(e, 'error_body'):
                error_body = e.error_body
            else:
                # Otherwise try to read it
                error_body = e.read().decode('utf-8') if e.fp else ''
        except Exception:
            error_body = ''
        
        # Parse error message for better user feedback
        error_message = f'Vision service HTTP error: {e.code}'
        if error_body:
            try:
                error_json = json.loads(error_body)
                error_detail = error_json.get('error', {})
                if isinstance(error_detail, dict):
                    api_message = error_detail.get('message', '')
                    if api_message:
                        # Handle "Provider returned error" - log for debugging
                        if 'provider returned error' in api_message.lower():
                            current_app.logger.error(f'Provider returned error for model {model}: {api_message}')
                            if e.code == 400:
                                # Check if it's GPT-5/5.1 specifically
                                if 'gpt-5' in model.lower():
                                    error_message = (
                                        f'{model} compatibility issue detected. This may be due to:\n'
                                        f'1. {model} not being available on OpenRouter yet\n'
                                        f'2. {model} not supporting vision/image inputs\n'
                                        '3. API parameter incompatibility\n\n'
                                        'Recommended alternatives:\n'
                                        '- openai/gpt-4o (best vision support)\n'
                                        '- openai/gpt-4-turbo\n'
                                        '- google/gemini-2.0-flash-exp:free\n\n'
                                        'To fix: Update VISION_MODEL in your config file or set VISION_MODEL environment variable.'
                                    )
                                else:
                                    # For GPT-4o and other models, show actual error
                                    error_message = f'OpenRouter API error: {api_message}. This might be due to API key permissions, model availability, or request format. Please check your OpenRouter account.'
                            else:
                                error_message = f'AI model provider error: {api_message}. The model ({model}) may not support vision capabilities or may not be available.'
                        # Check for rate limit specific messages
                        elif e.code == 429:
                            if 'free-models-per-day' in api_message or 'rate limit' in api_message.lower():
                                error_message = 'Daily free model limit reached. Please try again tomorrow or add credits to your OpenRouter account for more requests.'
                            else:
                                error_message = f'Rate limit reached: {api_message}'
                        # Handle 400 errors with more context
                        elif e.code == 400:
                            # Check for common 400 error reasons
                            if 'image' in api_message.lower() or 'vision' in api_message.lower() or 'format' in api_message.lower():
                                error_message = f'Image processing error: {api_message}'
                            else:
                                error_message = f'Request error: {api_message}'
                        else:
                            error_message = api_message
            except Exception:
                # If JSON parsing fails, show raw error body (truncated)
                if error_body:
                    error_message = f'{error_message} - {error_body[:200]}'
        
        return jsonify({'success': False, 'message': error_message}), e.code
    except urllib_error.URLError as e:
        return jsonify({'success': False, 'message': f'Vision service request failed: {e.reason}'}), 502
    except Exception as e:
        return jsonify({'success': False, 'message': f'Vision analysis failed: {str(e)}'}), 500


