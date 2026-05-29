import bridge from '../_bridge';
import handler from '../../analytics-pwa/api/live/update';

export default (request: any, response: any) => bridge(request, response, handler);
