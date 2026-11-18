import { Provider } from '@angular/core';
import { ContentDemoService } from './content-demo.service';
import { ContentStore } from './content.store';
import { ContentHttpService } from './content-http.service';
import { environment } from '../../../../environments/environment';

// TODO(content-ui): Blog UI đang được developer khác cải thiện; giữ adapter HTTP cơ sở này,
// sau đó rà lại mapper và các action khi giao diện blog mới được bàn giao.
export const CONTENT_PROVIDERS: Provider[] = [{
  provide: ContentStore,
  useFactory: () => environment.adminDataSource === 'http' ? new ContentHttpService() : new ContentDemoService()
}];
