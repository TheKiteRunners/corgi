import { observable, configure, action, runInAction } from 'mobx';
import { message } from 'antd';
import axios from 'axios';
import domtoimage from 'dom-to-image';

import { API_URL } from '../../../pagesConst';

configure({
  enforceActions: "observed",
})

interface IDesignData {
  fileName: string,
  coverUrl: string,
  info: {
    element: Array<{
      [propName: string]: any,
    }>,
    root: {
      [propName: string]: any,
    }
  },
  category: string[],
  isRelease?: boolean,
}

const pageParam = location.search.slice(1).split('&').map(e => e.split('='));
let templateId:string = '';
let designId: string = '';

if (Array.isArray(pageParam[0])) {
  if (pageParam[0][0] === 'templateid' && pageParam[0][1]) {
    templateId = pageParam[0][1]
  } else if (pageParam[0][0] === 'designid' && pageParam[0][1]) {
    designId = pageParam[0][1]
  }
}

class Store {
  /**
   * 设计数据
   */
  @observable public data: Partial<IDesignData> = {
    category: [],
    coverUrl: '',
    fileName: '',
    info: {
      element: [],
      root: {
        css: {
        },
        size: '',
      }
    },
  };

  /**
   * 通知工作区更改wrapper的px
   */
  @observable public changeFilepx = false;

  /**
   * 通知工作区scale设置为1, 要不然导出图片有问题, 以及开关加载状态
   */
  @observable public exporting = {
    ok: false,
    tips: '',
  }

  /**
   * 字体特效
   */
  @observable public fontSpecial = {
    描边: {
      textShadow: "rgb(93, 97, 255) 1px -2px 0px, rgb(93, 97, 255) 2px -2px 0px, rgb(93, 97, 255) 2px 1px 0px, rgb(93, 97, 255) 2px 2px 0px, rgb(93, 97, 255) 1px 2px 0px, rgb(93, 97, 255) 2px 2px 0px, rgb(93, 97, 255) -2px 1px 0px, rgb(93, 97, 255) -2px 2px 0px, rgb(93, 97, 255) 1px -1px 0px, rgb(93, 97, 255) 1px 1px 0px, rgb(93, 97, 255) 1px 1px 0px, rgb(93, 97, 255) -1px 1px 0px, rgb(255, 42, 106) 0px 0px 0px, rgb(255, 42, 106) 0.707107px 0.707107px 0px, rgb(255, 42, 106) 1.41421px 1.41421px 0px, rgb(255, 42, 106) 2.12132px 2.12132px 0px, rgb(255, 42, 106) 2.82843px 2.82843px 0px, rgb(255, 42, 106) 3.53553px 3.53553px 0px, rgb(255, 42, 106) 4.24264px 4.24264px 0px, rgb(255, 42, 106) 4.94975px 4.94975px 0px, rgb(255, 42, 106) 5.65685px 5.65685px 0px, rgb(255, 42, 106) 6.36396px 6.36396px 0px, rgb(0, 0, 0) 0px 0px 20px"
    },
    火焰: {
      textShadow: "0 -5px 4px #FF3, 2px -10px 6px #fd3,-2px -15px 11px #f80, 2px -18px 18px #f20"
    },
    立体: {
      textShadow: "rgb(204, 213, 219) 0px 0px 0px, rgb(204, 213, 219) 0.707107px 0.707107px 0px, rgb(204, 213, 219) 1.41421px 1.41421px 0px, rgb(204, 213, 219) 2.12132px 2.12132px 0px, rgb(204, 213, 219) 2.82843px 2.82843px 0px, rgb(204, 213, 219) 3.53553px 3.53553px 0px, rgb(204, 213, 219) 4.24264px 4.24264px 0px, rgb(204, 213, 219) 4.94975px 4.94975px 0px, rgb(204, 213, 219) 5.65685px 5.65685px 0px, rgb(204, 213, 219) 6.36396px 6.36396px 0px, rgb(0, 0, 0) 0px 0px 20px"
    },
    颤抖: {
      textShadow: "rgb(255, 42, 106) -1px 0px 0px, rgb(255, 42, 106) -2px 0px 0px, rgb(255, 42, 106) -3px 0px 0px, rgb(83, 235, 239) 1px 0px 0px, rgb(83, 235, 239) 2px 0px 0px, rgb(83, 235, 239) 3px 0px 0px, rgb(0, 0, 0) 0px 0px 0px"
    },
    默认: {
      
    }
  }

  /**
   * 素材特效
   */
  @observable public materialSpecial = {
    向上三角: {
      id: "triangle-up",
    },
    圆: {
      id: "circle",
    },
    正方形: {
      id: "square",
    },
    电视: {
      id: "tv"
    },
  }

  /**
   * 选中的组件
   */
  @observable public selectData = {
    id: -1,
    position: {
      zIndex: 1,
    },
    style: {},
    type: '',
  };

  /**
   * 图片素材
   */
  @observable public materialImgList: Array<{
    _id: string,
    type: string,
    url: string,
  }> = []

  @observable public scaleValue: number = 1;

  @observable public userInfo = {};
  @observable public faceCheck: boolean = false;

  @action
  public setUserInfo = (userInfo: any) => {
    this.userInfo = userInfo;
  }

  @action
  public setFaceCheck = (ok: boolean) => {
    this.faceCheck = ok;
  }
  /**
   * 导出封面
   */
  @action
  public getCoverUrl = async () => {
    this.setexporting(true, '保存中...')
    const target: any = document.getElementsByClassName('workspace')[0];
    if (target) {
      const blob = await domtoimage.toBlob(target, { quality: 0.5, width: parseInt(target.style.width, 10), height: parseInt(target.style.height, 10) });
      const formData = new FormData()
      formData.append('cover', blob);
      let dataParam = '';
      if (templateId) {
        dataParam = `templateid=${templateId}`;
      } else if (designId) {
        dataParam = `designid=${designId}`;
      } else {
        message.error(`无法保存`);
        return;
      }

      await axios({
        data: formData,
        method: 'post',
        url: `${API_URL}/api/img/uploadcover?${dataParam}`,
        withCredentials: true,
      }).then((e) => {
        const result = e.data;
        if (result.success) {
          runInAction(() => {
            this.data.coverUrl = result.data.file;
          })
        } else {
          message.error(`封面图保存失败: ${result.message}`);
        }
      }).catch((e) => {
        this.setexporting(false, '');
        message.error(`封面图保存失败`);
        // tslint:disable-next-line: no-console
        console.error(`封面图保存失败: ${JSON.stringify(e)}`)
      })
    } else {
      this.setexporting(false, '');
    }
  }
  
  /**
   * 保存当前文件数据
   */
  public getSaveData = async (noMessage: boolean = false) => {
    await this.getCoverUrl();
    let url = `${API_URL}/api/design/save`;
    if (templateId) {
      url = `${API_URL}/api/template/save`;
    } else if (designId) {
      url = `${API_URL}/api/design/save`;
    } else {
      message.error(`文件不存在`);
      this.setexporting(false, '');
      return;
    }
  
    axios({
      data: {
        ...this.data,
        id: designId || templateId,
      },
      method: 'post',
      url,
      withCredentials: true,
    }).then((e) => {
      const result = e.data;
      if (result.success) {
        if (!noMessage) {
          message.success(`保存成功`);
        }
      } else {
        message.error(`保存失败: ${result.message}`);
      }
      this.setexporting(false, '');
    }).catch((e) => {
      message.error(`保存失败`);
      this.setexporting(false, '');
      // tslint:disable-next-line: no-console
      console.error(`保存失败: ${JSON.stringify(e)}`)
    })
  }

  /**
   * 获取当前文件数据
   */
  @action
  public getFetchData = () => {
    let url = `${API_URL}/api/design/getfile`;
    if (templateId) {
      url = `${API_URL}/api/template/getfile`;
    } else if (designId) {
      url = `${API_URL}/api/design/getfile`;
    } else {
      message.error(`文件不存在`);
      return;
    }
    axios({
      method: 'get',
      params: {
        id: designId || templateId,
      },
      url,
      withCredentials: true,
    }).then((e) => {
      const result = e.data;
      if (result.success) {
        runInAction(() => {
          this.data = result.data;
        })
      } else {
        message.error(`获取文件数据失败: ${result.message}`);
      }
    }).catch((e) => {
      message.error(`获取文件数据请求失败`);
      // tslint:disable-next-line: no-console
      console.error(`获取文件数据请求失败: ${JSON.stringify(e)}`)
    })

  }

  /**
   * 获取用户上传的素材图片  
   */
  @action
  public getMaterialImgList() {
    axios({
      method: 'get',
      url: `${API_URL}/api/img/getMaterial`,
      withCredentials: true,
    }).then((e) => {
      const result = e.data;
      if (result.success) {
        runInAction(() => {
          this.materialImgList = result.data.list;
        })
      } else {
        message.error(`获取素材图片失败: ${result.message}`);
      }
    }).catch((e) => {
      message.error(`获取素材图片请求失败`);
      // tslint:disable-next-line: no-console
      console.error(`132获取素材图片请求失败: ${JSON.stringify(e)}`)
    })
  }


  /**
   * 更改模板发布状态
   * @param release 变更状态
   */
  @action
  public getRelease(release: boolean) {
    axios({
      data: {
        id: templateId,
        isRelease: release,
      },
      method: 'post',
      url: `${API_URL}/api/template/release`,
      withCredentials: true,
    }).then((e) => {
      const result = e.data;
      if (result.success) {
        runInAction(() => {
          this.data.isRelease = release;
        })
        message.success(`操作成功`);
      } else {
        message.error(`操作失败: ${result.message}`);
      }
    }).catch((e) => {
      message.error(`release操作请求失败`);
      // tslint:disable-next-line: no-console
      console.error(`release操作请求失败: ${JSON.stringify(e)}`)
    })
  }

  /**
   * 删除正在选中的组件
   */
  @action
  public setDeleteSelectData = (): void => {
    if (this.selectData.id !== -1 && this.data.info) {
      const result = this.data.info.element.findIndex((e: any): boolean => {
        return e.id === this.selectData.id
      });
      if (result !== -1) {
        this.data.info.element.splice(result, 1);
        this.selectData = {
          id: -1,
          position: {
            zIndex: 1,
          },
          style: {},
          type: '',
        };
      }
    }
  }

  /**
   * 设置工作区数据
   */
  @action
  public setDesignData = (value: Partial<IDesignData>): void => {
    this.data = {...this.data, ...value};
  }

  /**
   * 设置选中数据
   */
  @action
  public setSelectData = (value: any): void => {
    if (this.selectData.id !== value.id && this.selectData.type === 'font' && this.data.info) {
      // 由于font组件实现是基于contentible, 无法受控, 只能监听此处
      const result = this.data.info.element.find((e: any): boolean => {
          return e.id === this.selectData.id
      });
      if (result) {
        if (result.extends.contentEditable) {
          result.extends.contentEditable = false;
          result.style.cursor = 'default';
          Reflect.deleteProperty(result.extends, 'contentOld')
        }
      }
    }
    this.selectData = value;
  }

  @action
  public setChangeFilepx = (value: boolean) => {
    this.changeFilepx = value;
  }

  @action
  public setScaleValue = (value: number) => {
    this.scaleValue = value;
  }


  @action
  public setexporting = (value: boolean, message: string = '导出中...') => {
    this.exporting.ok = value;
    this.exporting.tips = message;
  }
}

export default new Store()
