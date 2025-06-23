using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Demo
{
    public class signStrategy
    {
        /// <summary>
        /// 附件编号，合同上传的附件序号:1,2,3…
        /// </summary>
        public int attachNo { get; set; }
        /// <summary>
        /// 关键字签约必传
        /// </summary>
        public string signKey { get; set; }
        /// <summary>
        /// 定位方式，2-坐标签章 3-关键字签章
        /// </summary>
        public string locationMode { get; set; }
        /// <summary>
        /// 签约页码:坐标签约必传
        /// </summary>
        public int signPage { get; set; }
        /// <summary>
        /// 左上角为原点，离左边框的宽度与pdf当页宽度的比例（小数位2位）, 坐标签约必传
        /// </summary>
        public double signX { get; set; }
        /// <summary>
        /// 左上角为原点，离顶边框的高度与pdf当页高度的比例（小数位2位）, 坐标签约必传
        /// </summary>
        public double signY { get; set; }
    }
}
