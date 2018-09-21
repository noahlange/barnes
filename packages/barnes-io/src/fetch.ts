import { plugin, Plugin } from 'barnes';
import f from 'node-fetch';

export default function(url: string) {
  return plugin(function fetch() {
    return f(url).then(res => res.json());
  }, Plugin.FROM);
}
