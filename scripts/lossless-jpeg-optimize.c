#include <stdio.h>
#include <stdlib.h>
#include "jpeglib.h"
int main(int argc, char **argv) {
 if(argc!=3) return 2;
 FILE *in=fopen(argv[1],"rb"),*out=fopen(argv[2],"wb");
 if(!in||!out) return 3;
 struct jpeg_decompress_struct src;
 struct jpeg_compress_struct dst;
 struct jpeg_error_mgr es,ed;
 src.err=jpeg_std_error(&es);dst.err=jpeg_std_error(&ed);
 jpeg_create_decompress(&src);jpeg_create_compress(&dst);
 jpeg_stdio_src(&src,in);
 for(int m=0;m<16;m++) jpeg_save_markers(&src,JPEG_APP0+m,0xFFFF);
 jpeg_save_markers(&src,JPEG_COM,0xFFFF);
 jpeg_read_header(&src,TRUE);
 jvirt_barray_ptr *coeffs=jpeg_read_coefficients(&src);
 jpeg_copy_critical_parameters(&src,&dst);
 dst.optimize_coding=TRUE;
 dst.write_JFIF_header=FALSE;
 dst.write_Adobe_marker=FALSE;
 jpeg_simple_progression(&dst);
 jpeg_stdio_dest(&dst,out);
 jpeg_write_coefficients(&dst,coeffs);
 for(jpeg_saved_marker_ptr m=src.marker_list;m;m=m->next)
  jpeg_write_marker(&dst,m->marker,m->data,m->data_length);
 jpeg_finish_compress(&dst);
 jpeg_finish_decompress(&src);
 jpeg_destroy_compress(&dst);jpeg_destroy_decompress(&src);
 fclose(in);fclose(out);return 0;
}
