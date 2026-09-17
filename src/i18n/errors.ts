import type { ValidationError } from '../store/actions';
import type { Messages } from './messages/zh-TW';

/** 新增題目的輸入錯誤；字典裡的 {id} 換成題號 */
export function validationMessage(t: Messages, err: ValidationError): string {
  return t.errors.validation[err.code].replace('{id}', String(err.problemId ?? ''));
}
